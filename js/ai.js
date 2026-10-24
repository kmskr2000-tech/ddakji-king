// 상대 AI 타격 모델 + 버티기(방어) 판정. 순수 함수 — 시뮬레이션 테스트에서도 사용.
import { Level, judge } from './aim.js?v=1792845610';

export function randn(rng = Math.random) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// skill 0~1 → 착탄 오차(σ px)와 파워 분포. 기울어진 딱지에는 파워를 아껴도 되므로 덜 세게 친다.
export function aiStrike(skill, tiltStacks = 0, rng = Math.random) {
  const sigma = 80 - 62 * skill;
  const dist = Math.abs(randn(rng)) * sigma;
  const ang = rng() * Math.PI * 2;
  const mu = 0.52 + 0.42 * skill - 0.04 * tiltStacks;
  const power = clamp(mu + randn(rng) * (0.16 - 0.08 * skill), 0, 1);
  return { dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist, power };
}

// 버티기 타이밍: 0 = 정확. |오차| ≤ perfect → 'perfect', ≤ good → 'good', 아니면 'fail'
export const BLOCK = { perfect: 0.07, good: 0.16, goodPowerMul: 0.82 };
export function blockGrade(errSec) {
  const e = Math.abs(errSec);
  return e <= BLOCK.perfect ? 'perfect' : e <= BLOCK.good ? 'good' : 'fail';
}

// 상대 타격 판정 + 버티기 보정. good = 파워 감소(판정 전), perfect = 결과 한 단계 강등(판정 후).
export function judgeWithBlock(x, y, power, attacker, defender, block, rng = Math.random) {
  const tiltBefore = defender.tiltStacks;
  const p = block === 'good' ? power * BLOCK.goodPowerMul : power;
  const r = judge(x, y, p, attacker, defender, rng);
  r.blocked = false;
  if (block === 'perfect' && (r.level === Level.FLIP || r.level === Level.INNER)) {
    r.blocked = true;
    if (r.level === Level.FLIP) { r.level = Level.INNER; defender.tiltStacks = Math.min(2, tiltBefore + 1); }
    else { r.level = Level.MISS; defender.tiltStacks = tiltBefore; }
    r.crit = false;
  }
  r.power = p;
  return r;
}
