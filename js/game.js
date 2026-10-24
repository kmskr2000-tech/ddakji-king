// 진행·경제 규칙. 세이브 상태 S를 받아 변경하는 순수 로직 (렌더 무관).
import { effectiveStats } from './aim.js?v=1792845490';
import { DDAKJI, DDAKJI_BY_ID, OPPONENTS, REGIONS, STAT_COST, ITEM_INFO, GACHA, GACHA_POOL, DAILY, TITLES, ACHIEVEMENTS, guardMul } from './data.js?v=1792845490';

export const equippedDdakji = (S) => DDAKJI_BY_ID[S.equipped] || DDAKJI_BY_ID.starter;

// 기본 스탯(강화 + 장착 딱지 보너스, 상한 6)
export function baseStats(S) {
  const d = equippedDdakji(S), b = d.bonus || {};
  const out = {};
  for (const k of ['str', 'focus', 'luck']) out[k] = Math.min(6, (S.stats[k] || 0) + (b[k] || 0));
  return out;
}
export const battleStats = (S, item) => effectiveStats(baseStats(S), item);
export const playerGuard = (S) => guardMul(equippedDdakji(S).guard);

export const statCost = (lv) => (lv >= STAT_COST.length ? null : STAT_COST[lv]);
export function upgradeStat(S, k) {
  const c = statCost(S.stats[k]);
  if (c == null || S.coins < c) return false;
  S.coins -= c; S.stats[k]++;
  return true;
}

export function buyItem(S, id, n = 1) {
  const c = ITEM_INFO[id].price * n;
  if (S.coins < c) return false;
  S.coins -= c; S.items[id] = (S.items[id] || 0) + n;
  return true;
}

// 진행 해금: 첫 상대는 열림, 이후 직전 상대를 이겨야 열림
export const isBeaten = (S, opp) => (S.beaten[opp.id] || 0) > 0;
export const isUnlocked = (S, opp) => opp.n === 0 || isBeaten(S, OPPONENTS[opp.n - 1]);
export const regionCleared = (S, r) => OPPONENTS.filter((o) => o.region === r).every((o) => isBeaten(S, o));
export const regionUnlocked = (S, r) => r === 1 || regionCleared(S, r - 1);
export function clearedRegions(S) { let n = 0; for (const R of REGIONS) { if (regionCleared(S, R.id)) n++; else break; } return n; }
export const titleOf = (S) => TITLES[clearedRegions(S)];
export const nextOpponent = (S) => OPPONENTS.find((o) => !isBeaten(S, o)) || null;
export const collectionCount = (S) => Object.keys(S.owned).filter((k) => S.owned[k] > 0 && DDAKJI_BY_ID[k]).length;

// 대결 보상. 첫 승리: 전액 + 상대 딱지 획득. 재대결: 50%. 패배: 참가상 15%. 뒤집기·크리 보너스.
export function settle(S, opp, { win, flips = 0, crits = 0 }) {
  const first = win && !isBeaten(S, opp);
  let coins = win ? (first ? opp.reward : Math.round(opp.reward * 0.5)) : Math.round(opp.reward * 0.15);
  coins += flips * 5 + crits * 3;
  let drop = null;
  if (win) {
    S.beaten[opp.id] = (S.beaten[opp.id] || 0) + 1;
    S.record.wins++;
    if (first) { drop = opp.ddakji; S.owned[drop] = (S.owned[drop] || 0) + 1; }
  } else S.record.losses++;
  S.record.flips += flips; S.record.crits += crits;
  S.coins += coins;
  return { coins, drop, first };
}

// 뽑기. ticket=true면 뽑기권 사용. 중복은 코인 환급.
export function pull(S, rng = Math.random, ticket = false) {
  if (ticket) { if (S.tickets <= 0) return null; S.tickets--; }
  else { if (S.coins < GACHA.price) return null; S.coins -= GACHA.price; }
  let x = rng(), rar = 'N';
  for (const [k, p] of Object.entries(GACHA.rates)) { if (x < p) { rar = k; break; } x -= p; }
  const pool = GACHA_POOL.filter((d) => d.rarity === rar);
  const d = pool[Math.floor(rng() * pool.length)] || GACHA_POOL[0];
  const dup = (S.owned[d.id] || 0) > 0;
  S.owned[d.id] = (S.owned[d.id] || 0) + 1;
  const refund = dup ? GACHA.dupRefund[d.rarity] : 0;
  S.coins += refund;
  S.record.pulls++;
  return { d, dup, refund };
}

// 출석: 로컬 날짜 기준. 연속이면 streak+1, 하루 이상 끊기면 1일차부터.
export const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
export function dailyPending(S, now = Date.now()) {
  const today = dayKey(now);
  if (S.daily.last === today) return null;
  const yesterday = dayKey(now - 864e5);
  const streak = S.daily.last === yesterday ? S.daily.streak + 1 : 1;
  const idx = (streak - 1) % DAILY.length;
  return { today, streak, idx, reward: DAILY[idx] };
}
export function claimDaily(S, p, mul = 1) {
  S.daily = { last: p.today, streak: p.streak };
  if (p.reward === 'ticket') S.tickets += mul;
  else S.coins += p.reward * mul;
}

// 도전과제 진행도
export function achStat(S, stat) {
  switch (stat) {
    case 'collection': return collectionCount(S);
    case 'maxStat': return Math.max(S.stats.str, S.stats.focus, S.stats.luck);
    case 'regions': return clearedRegions(S);
    case 'endlessBest': return S.endless.best;
    default: return S.record[stat] || 0;
  }
}
export const achReady = (S, a) => !S.ach[a.id] && achStat(S, a.stat) >= a.n;
export const achPending = (S) => ACHIEVEMENTS.filter((a) => achReady(S, a)).length;
export function claimAch(S, a) {
  if (!achReady(S, a)) return false;
  S.ach[a.id] = 1; S.coins += a.coins; S.tickets += a.tickets || 0;
  return true;
}

// 무한 도장깨기: 딱지왕을 이긴 뒤 열림. 연승할수록 강해지고 보상도 커진다.
export const endlessUnlocked = (S) => regionCleared(S, 6);
export function endlessOpp(S, rng = Math.random) {
  const k = S.endless.streak;
  const base = OPPONENTS[Math.floor(rng() * OPPONENTS.length)];
  const pool = DDAKJI.filter((d) => d.id !== 'starter');
  const boss = k % 5 === 4;
  return {
    id: 'endless', endless: true, n: -1, region: 6, idx: 0, boss,
    name: `${k + 1}번째 도전자 ${base.name.split(' ').pop()}`, quote: boss ? '도장의 사범이다!' : '딱지왕, 한 판 붙자!',
    look: base.look, stats: { str: 6, focus: 6, luck: Math.min(6, 3 + Math.floor(k / 3)) },
    skill: Math.min(0.995, 0.9 + 0.006 * k + (boss ? 0.03 : 0)),
    ddakji: pool[Math.floor(rng() * pool.length)].id,
    lives: boss ? 3 : 2,
    reward: Math.round((260 + 30 * k) * (boss ? 1.8 : 1)),
  };
}
export function settleEndless(S, o, { win, flips = 0, crits = 0 }) {
  let coins;
  if (win) { S.endless.streak++; S.endless.best = Math.max(S.endless.best, S.endless.streak); S.record.wins++; coins = o.reward; }
  else { S.endless.streak = 0; S.record.losses++; coins = Math.round(o.reward * 0.15); }
  coins += flips * 5 + crits * 3;
  S.record.flips += flips; S.record.crits += crits;
  S.coins += coins;
  return { coins, drop: null, first: false };
}
