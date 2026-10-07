import assert from 'node:assert/strict';
import { CFG, Level, Aim, Charge, rollAimParams, effectiveStats, judge, radii, powerScale } from '../js/aim.js';

const mk = (str = 0, luck = 0, extra = {}) => ({ stats: { str, focus: 0, luck }, hasTape: false, tapeUsed: false, ...extra });
const def = (tilt = 0) => ({ x: 210, y: 380, tiltStacks: tilt });
const never = () => 0.999, always = () => 0;
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);

// 설계안 §3.3 예시: 힘4·풀차지·기울어짐1 → 불스아이 27.6
near(radii({ str: 4 }, 1, 1).bull, 27.6);
near(radii({ str: 0 }, 0, 0).bull, 9);      // 즉시 탭 ×0.5
near(radii({ str: 0 }, 0.5, 0).inner, 40 * 0.75);
near(powerScale(1), 1); near(powerScale(0), 0.5);
near(radii({ str: 0 }, 1, 2).inner, 40 * 1.3225);

// 구역 판정 (파워1, 힘0: bull 18 / inner 40 / 딱지 100)
let d = def();
assert.equal(judge(210, 380, 1, mk(), d, never).level, Level.FLIP);
assert.equal(judge(210 + 18, 380, 1, mk(), d, never).level, Level.FLIP);       // 경계 포함
assert.equal(judge(210 + 30, 380, 1, mk(), d, never).level, Level.INNER);
assert.equal(judge(210 + 70, 380, 1, mk(), d, never).level, Level.MISS);
assert.equal(judge(210 + 101, 380, 1, mk(), d, never).level, Level.WHIFF);

// 기울어짐: INNER 비크리 → +1, 최대 2, FLIP 시 리셋
d = def();
judge(240, 380, 1, mk(), d, never); assert.equal(d.tiltStacks, 1);
judge(240, 380, 1, mk(), d, never); judge(240, 380, 1, mk(), d, never); assert.equal(d.tiltStacks, 2);
judge(210, 380, 1, mk(), d, never); assert.equal(d.tiltStacks, 0);

// 크리티컬: MISS→INNER(스택 없음), INNER→FLIP, WHIFF 불가
d = def();
let r = judge(280, 380, 1, mk(), d, always); assert.deepEqual([r.level, r.crit, d.tiltStacks], [Level.INNER, true, 0]);
r = judge(240, 380, 1, mk(), d, always); assert.deepEqual([r.level, r.crit], [Level.FLIP, true]);
r = judge(400, 380, 1, mk(), d, always); assert.equal(r.level, Level.WHIFF);
// 확률 경계: 운0 → 5%
assert.equal(judge(280, 380, 1, mk(0, 0), def(), () => 0.049).crit, true);
assert.equal(judge(280, 380, 1, mk(0, 0), def(), () => 0.051).crit, false);
assert.equal(judge(280, 380, 1, mk(0, 2), def(), () => 0.109).crit, true);  // 5+6=11%

// 양면테이프: WHIFF 1회만 INNER로 승격 + 기울어짐 +1, 소진
const t = mk(0, 0, { hasTape: true }); d = def();
assert.equal(judge(400, 380, 1, t, d, never).level, Level.INNER); assert.equal(t.tapeUsed, true); assert.equal(d.tiltStacks, 1);
assert.equal(judge(400, 380, 1, t, d, never).level, Level.WHIFF); assert.equal(d.tiltStacks, 1);

// 아이템 스탯
assert.deepEqual(effectiveStats({ str: 3, focus: 0, luck: 1 }, 'lead'), { str: 5, focus: 0, luck: 1 });
assert.equal(effectiveStats({ str: 0, focus: 3, luck: 6 }, 'coin500').luck, 8);

// 차지
let c = new Charge(); c.press(); c.update(0.6); near(c.power, 0.5); c.update(5); near(c.power, 1);
c.press(); near(c.release(), 0);                 // 즉시 탭
c = new Charge(true); c.press(); c.update(0.3); near(c.power, 0.5);  // 무쇠손

// 리사주: 범위 내, 집중 효과, 차지 전환 시 점프 없음
const rng = (() => { let s = 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const P = rollAimParams({ focus: 0 }, rng);
assert.ok(P.T1 >= 1.28 && P.T1 <= 1.92 && P.T2 >= 1.84 && P.T2 <= 2.76);
const P6 = rollAimParams({ focus: 6 }, () => 0.5);
near(P6.Ax, 60 * 0.64); near(P6.T1, 1.6 * 1.24);
const a = new Aim(P); let maxDx = 0, maxDy = 0, px = a.x, py = a.y, maxJump = 0;
for (let i = 0; i < 6000; i++) {
  a.step(1 / 60, (i % 300) > 150);
  maxDx = Math.max(maxDx, Math.abs(a.x - 210)); maxDy = Math.max(maxDy, Math.abs(a.y - 380));
  maxJump = Math.max(maxJump, Math.hypot(a.x - px, a.y - py)); px = a.x; py = a.y;
}
assert.ok(maxDx <= 90.001 && maxDy <= 67.501, `range ${maxDx} ${maxDy}`);
assert.ok(maxJump < 12, `jump ${maxJump}`); // 최대 속도 한계(~7px/frame x 진폭 보간분) 이내 = 불연속 없음

// 몬테카를로: 무작위 에임 위치(리사주 실제 궤적, 풀차지, 힘0)의 구역 분포 참고치
const N = 20000, cnt = { FLIP: 0, INNER: 0, MISS: 0, WHIFF: 0 };
for (let i = 0; i < N; i++) {
  const p = rollAimParams({ focus: 0 }, rng); const ai = new Aim(p);
  ai.step(rng() * 10, false);
  cnt[judge(ai.x, ai.y, 1, mk(), def(), rng).level]++;
}
console.log('random-timing dist (str0, full charge):', Object.fromEntries(Object.entries(cnt).map(([k, v]) => [k, (100 * v / N).toFixed(1) + '%'])));
console.log('ALL PASS');
