// 밸런스 시뮬레이션: 지역별 "적정 성장" 플레이어가 각 상대에게 이길 확률.
// 사용: node tools/sim-balance.mjs [반응 오차 σ(ms)=120] [버티기 perfect 확률=0.2] [good 확률=0.3]
import { judge, effectiveStats, Aim, Charge, rollAimParams } from '../js/aim.js';
import { aiStrike, judgeWithBlock, randn } from '../js/ai.js';
import { OPPONENTS, DDAKJI_BY_ID, guardMul } from '../js/data.js';

let seed = 7;
const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const SIG = +(process.argv[2] || 120) / 1000;
const BP = +(process.argv[3] ?? 0.2), BG = +(process.argv[4] ?? 0.3);

// 사람 봇: 누르고 파워 ≥ 75%가 되면, 조준점이 중심 20px 안을 지나는 순간 + 반응 오차에 손을 뗀다.
function humanShot(stats) {
  const aim = new Aim(rollAimParams(stats, rng), { x: 0, y: 0 });
  aim.step(rng() * 4, false);
  const ch = new Charge(false); ch.press();
  const dt = 1 / 120;
  let t = 0, fire = null;
  while (t < 4) {
    aim.step(dt, true); ch.update(dt); t += dt;
    if (fire == null && ch.power >= 0.75 && Math.hypot(aim.x, aim.y) < 20) fire = t + randn(rng) * SIG;
    if (fire != null && t >= fire) break;
  }
  return { x: aim.x, y: aim.y, power: ch.power };
}

// 적정 성장: 지역 r 도전 시 스탯 레벨 ≈ r-1 (+최대 6), 직전 지역 보스 딱지 장착
function playerAt(r) {
  const lv = Math.min(6, r - 1);
  const d = r === 1 ? DDAKJI_BY_ID.starter : DDAKJI_BY_ID['o' + (r - 1) * 5];
  const b = d.bonus;
  const stats = effectiveStats({ str: Math.min(6, lv + (b.str || 0)), focus: Math.min(6, lv + (b.focus || 0)), luck: Math.min(6, lv + (b.luck || 0)) }, '');
  return { stats, guard: guardMul(d.guard) };
}

function match(opp, pl) {
  const me = { stats: pl.stats, hasTape: false, tapeUsed: false };
  const ai = { stats: effectiveStats(opp.stats, ''), hasTape: false, tapeUsed: false };
  let myLives = opp.lives, oppLives = opp.lives, turns = 0;
  const oppD = { x: 0, y: 0, tiltStacks: 0, guard: guardMul(DDAKJI_BY_ID[opp.ddakji].guard) };
  const myD = { x: 0, y: 0, tiltStacks: 0, guard: pl.guard };
  const first = rng() < 0.5;  // 가위바위보로 선공 결정
  for (let round = 1; round <= 40; round++) {
    const sd = round > 6 ? 1 + 0.15 * (round - 6) : 1;  // 결전 보정
    // 플레이어: 집중이 높을수록 조준 오차 감소, 필요 파워를 넘기려 함
    let r;
    if (round > 1 || first) {
      const h = humanShot(pl.stats);
      oppD.guard = guardMul(DDAKJI_BY_ID[opp.ddakji].guard) * sd;
      r = judge(h.x, h.y, h.power, me, oppD, rng);
      turns++;
      if (r.level === 'FLIP') { oppLives--; oppD.tiltStacks = 0; if (oppLives <= 0) return { win: true, turns }; }
    }
    // 상대 + 버티기 (BP = perfect 확률, BG = good 확률)
    const a = aiStrike(opp.skill, myD.tiltStacks, rng);
    const x = rng(), block = x < BP ? 'perfect' : x < BP + BG ? 'good' : 'fail';
    myD.guard = pl.guard * sd;
    r = judgeWithBlock(a.dx, a.dy, a.power, ai, myD, block, rng);
    if (r.level === 'FLIP') { myLives--; myD.tiltStacks = 0; if (myLives <= 0) return { win: false, turns }; }
  }
  return { win: false, turns };
}

const N = 1500;
console.log(`human reaction σ=${SIG * 1000}ms`);
for (const o of OPPONENTS) {
  const pl = playerAt(o.region);
  let w = 0, t = 0;
  for (let i = 0; i < N; i++) { const m = match(o, pl); w += m.win; t += m.turns; }
  console.log(`${o.boss ? '★' : ' '} R${o.region}-${o.idx + 1} ${o.name.padEnd(14)} skill ${o.skill.toFixed(2)} str${o.stats.str} → win ${(100 * w / N).toFixed(0).padStart(3)}%  avg turns ${(t / N).toFixed(1)}  reward ${o.reward}`);
}
