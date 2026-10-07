// 에임(리사주)·차지·판정 코어. DOM 의존 없음 — 브라우저/Node 공용.
// 설계안 §3.1~3.5, §4.

export const CFG = {
  W: 420, H: 800,
  center: { x: 210, y: 380 },
  ddakjiR: 100,
  aim: { Ax: 60, Ay: 45, T1: 1.6, T2: 2.3, phi: Math.PI / 3, randJitter: 0.2 },
  focusAmp: 0.06, focusPeriod: 0.04,
  chargeAmp: 1.5, chargeSpeed: 1.2, chargeBlend: 0.12, // blend: 차지 전환 시 진폭 보간 시간(s)
  fullCharge: 1.2, fullChargeIronHand: 0.6,
  power: { min: 0.5, range: 0.5 },
  bull: { base: 18, perStr: 1.5 },
  inner: { base: 40, perStr: 2 },
  tilt: { factor: 1.15, max: 2 },
  crit: { base: 0.05, perLuck: 0.03 },
};

export const Level = { FLIP: 'FLIP', INNER: 'INNER', MISS: 'MISS', WHIFF: 'WHIFF' };

export const ITEMS = ['lead', 'tape', 'fan', 'coin500', 'ironHand'];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// 기본 스탯 {str, focus, luck} + 아이템 → 효과 스탯. (§3.5)
// 납덩이: 힘+2 집중-1(하한0). 500원: 운+2(상한6 초과 허용, 최대 8). 그 외 상한 6.
export function effectiveStats(base, item) {
  const s = {
    str: clamp(base.str ?? 0, 0, 6),
    focus: clamp(base.focus ?? 0, 0, 6),
    luck: clamp(base.luck ?? 0, 0, 6),
  };
  if (item === 'lead') { s.str = Math.min(8, s.str + 2); s.focus = Math.max(0, s.focus - 1); }
  if (item === 'coin500') s.luck = Math.min(8, s.luck + 2);
  return s;
}

// 라운드 시작 시 에임 파라미터 굴림. T1/T2 ±20%, φ 0~2π. (§3.1)
export function rollAimParams(stats, rng = Math.random) {
  const j = CFG.aim.randJitter;
  const jit = () => 1 + (rng() * 2 - 1) * j;
  const f = stats.focus;
  return {
    Ax: CFG.aim.Ax * (1 - CFG.focusAmp * f),
    Ay: CFG.aim.Ay * (1 - CFG.focusAmp * f),
    T1: CFG.aim.T1 * jit() * (1 + CFG.focusPeriod * f),
    T2: CFG.aim.T2 * jit() * (1 + CFG.focusPeriod * f),
    phi: rng() * Math.PI * 2,
  };
}

// 에임 위치 시뮬레이터. 위상 누적 방식이라 차지 전환 시 위치가 튀지 않는다
// (차지 중 주기 ×1/1.2 → 각속도 ×1.2, 진폭 ×1.5는 chargeBlend 동안 보간).
export class Aim {
  constructor(params, center = CFG.center) {
    this.p = params;
    this.c = center;
    this.ph1 = 0;
    this.ph2 = params.phi;
    this.ampMul = 1;
    this.charging = false;
    this.gust = { x: 0, y: 0 }; // 돌풍 변위(외부에서 설정, 후속 작업)
  }
  step(dt, charging = this.charging) {
    this.charging = charging;
    const sp = charging ? CFG.chargeSpeed : 1;
    this.ph1 += (2 * Math.PI * dt * sp) / this.p.T1;
    this.ph2 += (2 * Math.PI * dt * sp) / this.p.T2;
    const target = charging ? CFG.chargeAmp : 1;
    const k = Math.min(1, dt / CFG.chargeBlend);
    this.ampMul += (target - this.ampMul) * k;
  }
  get x() { return this.c.x + this.p.Ax * this.ampMul * Math.sin(this.ph1) + this.gust.x; }
  get y() { return this.c.y + this.p.Ay * this.ampMul * Math.sin(this.ph2) + this.gust.y; }
}

// 차지 게이지. press → update(dt) → release() = 파워 0~1. (§3.2)
export class Charge {
  constructor(ironHand = false) {
    this.full = ironHand ? CFG.fullChargeIronHand : CFG.fullCharge;
    this.t = 0;
    this.active = false;
  }
  press() { this.t = 0; this.active = true; }
  update(dt) { if (this.active) this.t += dt; }
  get power() { return clamp(this.t / this.full, 0, 1); }
  release() { const p = this.power; this.active = false; this.t = 0; return p; }
}

export const powerScale = (power) => CFG.power.min + CFG.power.range * clamp(power, 0, 1);

// 판정 반경 (§3.3)
export function radii(attackerStats, power, tiltStacks) {
  const ps = powerScale(power);
  const ts = Math.pow(CFG.tilt.factor, tiltStacks);
  return {
    bull: (CFG.bull.base + CFG.bull.perStr * attackerStats.str) * ps * ts,
    inner: (CFG.inner.base + CFG.inner.perStr * attackerStats.str) * ps * ts,
  };
}

const upgrade = (lv) => (lv === Level.MISS ? Level.INNER : lv === Level.INNER ? Level.FLIP : lv);

// 판정 — 설계안 §4 의사코드 그대로.
// attacker: { stats:{str,luck,...}, hasTape, tapeUsed }  (tape 상태는 여기서 변경)
// defender: { x, y, tiltStacks }                          (tiltStacks는 여기서 변경)
export function judge(aimX, aimY, power, attacker, defender, rng = Math.random) {
  const dx = aimX - defender.x;
  const dy = aimY - defender.y;
  const dist = Math.hypot(dx, dy);
  const { bull, inner } = radii(attacker.stats, power, defender.tiltStacks);

  let level;
  let crit = false;
  if (dist <= CFG.ddakjiR) {
    if (dist <= bull) level = Level.FLIP;
    else if (dist <= inner) level = Level.INNER;
    else level = Level.MISS;
    if (level !== Level.FLIP && rng() < CFG.crit.base + CFG.crit.perLuck * attacker.stats.luck) {
      level = upgrade(level);
      crit = true;
    }
  } else {
    level = Level.WHIFF;
  }

  // 양면테이프: WHIFF 1회 → INNER 승격 (소진). 아래 규칙으로 기울어짐 +1스택 (기획안 3.5)
  if (level === Level.WHIFF && attacker.hasTape && !attacker.tapeUsed) {
    attacker.tapeUsed = true;
    level = Level.INNER;
  }

  if (level === Level.INNER && !crit) {
    defender.tiltStacks = Math.min(CFG.tilt.max, defender.tiltStacks + 1);
  }
  if (level === Level.FLIP) defender.tiltStacks = 0;

  return { level, dist, crit, bull, inner };
}
