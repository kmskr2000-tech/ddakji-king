// 저장: localStorage(실패 시 메모리). 기본값 병합으로 이전 세이브와 호환.
const KEY = 'ddakji-king-save-v1';

export const defaults = () => ({
  ver: 1,
  coins: 150,
  tickets: 0,                         // 무료 뽑기권
  stats: { str: 0, focus: 0, luck: 0 },
  items: { lead: 0, tape: 1, fan: 0, coin500: 1, ironHand: 0 },
  owned: { starter: 1 },              // 딱지 id → 보유 수
  equipped: 'starter',
  beaten: {},                         // 상대 id → 승리 횟수
  settings: { sfx: true, music: true, vib: true },
  daily: { last: '', streak: 0 },
  tutorial: false,
  record: { wins: 0, losses: 0, flips: 0, crits: 0, perfectBlocks: 0, pulls: 0 },
  endingSeen: false,
  adCoinLast: 0,                      // 광고 보상 쿨다운
  adPullDay: '',                      // 하루 1회 광고 무료 뽑기
  ach: {},                            // 도전과제 id → 보상 수령
  endless: { streak: 0, best: 0, pending: false },  // 무한 도장깨기 (pending = 대결 중)
  created: Date.now(),
});

function merge(base, data) {
  if (!data || typeof data !== 'object') return base;
  for (const k of Object.keys(base)) {
    const b = base[k], d = data[k];
    if (d === undefined) continue;
    if (b && typeof b === 'object' && !Array.isArray(b)) base[k] = merge(b, d);
    else if (typeof d === typeof b && (typeof d !== 'number' || Number.isFinite(d))) base[k] = d;
  }
  // 동적 키 맵은 그대로 보존
  for (const k of ['owned', 'beaten', 'ach']) {
    if (!data[k] || typeof data[k] !== 'object') continue;
    for (const [id, v] of Object.entries(data[k])) if (Number.isFinite(v) && v >= 0) base[k][id] = Math.floor(v);
  }
  return base;
}

let mem = null;
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return merge(defaults(), JSON.parse(raw));
  } catch (e) { /* 손상·접근 불가 → 새 세이브 */ }
  return mem ? merge(defaults(), mem) : defaults();
}

export function save(state) {
  mem = JSON.parse(JSON.stringify(state));
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 사파리 프라이빗 등 */ }
}

export function wipe() {
  mem = null;
  try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ }
}
