// 성장 씬: 강화, 문방구(뽑기·아이템), 딱지첩(수집·장착).
import { App } from './app.js?v=1792845191';
import { UI, view, topBar, ease } from './ui.js?v=1792845191';
import { text, rr, drawDdakji, drawKid, coin, ticket, itemIcon, shade, star } from './gfx.js?v=1792845191';
import { DDAKJI, DDAKJI_BY_ID, RARITY, STAT_INFO, ITEM_INFO, ITEM_ORDER, GACHA, guardMul } from './data.js?v=1792845191';
import { statCost, upgradeStat, buyItem, pull, baseStats, equippedDdakji, collectionCount, dayKey } from './game.js?v=1792845191';
import { Sound } from './audio.js?v=1792845191';
import { Ads, track, Haptics } from './platform.js?v=1792845191';
import { HomeScene } from './scene-menu.js';

// ───────── 강화 ─────────
export const UpgradeScene = {
  enter() { this.t = 0; this.pop = {}; },
  update(dt) { this.t += dt; for (const k in this.pop) this.pop[k] = Math.max(0, this.pop[k] - dt * 2); },
  draw(ctx) {
    const { W, H } = view, S = App.S;
    ctx.fillStyle = '#2f3a5a'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) { ctx.fillStyle = 'rgba(255,255,255,.03)'; ctx.fillRect(0, 70 + i * 60, W, 30); }
    topBar(S, '강화', () => App.go('home'));
    const bonus = equippedDdakji(S).bonus || {};
    const st = baseStats(S);
    ['str', 'focus', 'luck'].forEach((k, i) => {
      const info = STAT_INFO[k], lv = S.stats[k], cost = statCost(lv);
      const y = 84 + i * 168, pop = this.pop[k] || 0;
      ctx.save(); ctx.translate(W / 2, y + 75); ctx.scale(1 + pop * 0.05, 1 + pop * 0.05); ctx.translate(-W / 2, -(y + 75));
      UI.panel(18, y, W - 36, 152, { fill: '#fff8ea' });
      ctx.fillStyle = info.color; ctx.beginPath(); ctx.arc(58, y + 44, 26, 0, 7); ctx.fill();
      text(ctx, info.name, 58, y + 45, { size: 22, color: '#fff', stroke: shade(info.color, -0.4), sw: 4 });
      text(ctx, `${info.name} Lv.${lv}`, 96, y + 32, { size: 24, align: 'left', color: '#3a1f12' });
      text(ctx, info.desc, 96, y + 60, { size: 15, align: 'left', color: '#8a6a50' });
      for (let p = 0; p < 6; p++) {
        ctx.fillStyle = p < lv ? info.color : '#e2d6c2'; rr(ctx, 34 + p * 30, y + 86, 24, 14, 5); ctx.fill();
      }
      if (bonus[k]) text(ctx, `딱지 보너스 +${bonus[k]} → 적용 ${st[k]}`, 34, y + 124, { size: 14, align: 'left', color: '#c0392b' });
      const can = cost != null && S.coins >= cost;
      if (cost == null) text(ctx, 'MAX', W - 92, y + 100, { size: 30, color: info.color, stroke: '#3a1f12', sw: 4 });
      else UI.button('up-' + k, W - 160, y + 74, 124, 60, '강화', { color: can ? '#ffcc33' : '#cfc8d8', size: 22, sub: `${cost} 코인`, disabled: !can, sfx: 'levelup', onDisabled: () => UI.toast('코인이 부족해요'), onClick: () => {
        if (upgradeStat(S, k)) { App.persist(); this.pop[k] = 1; Haptics.buzz(25); App.fx.burst(W - 98, y + 90, { n: 24, colors: [info.color, '#fff', '#ffe066'], shape: 'star', speed: 260, size: 6 }); App.fx.float(`${info.name} UP!`, W - 98, y + 50, { color: '#ffe066' }); track('upgrade', { stat: k, lv: S.stats[k] }); }
      } });
      ctx.restore();
    });
    const y = 84 + 3 * 168;
    if (y + 60 < H) {
      const d = equippedDdakji(S);
      UI.panel(18, y, W - 36, 74, { fill: 'rgba(255,248,234,.9)' });
      drawDdakji(ctx, d, 60, y + 37, 22, { shadow: false });
      text(ctx, `장착: ${d.name}`, 96, y + 26, { size: 18, align: 'left', color: '#3a1f12', maxW: W - 140 });
      text(ctx, `방어 ${d.guard} (상대 판정 -${Math.round((1 - guardMul(d.guard)) * 100)}%)`, 96, y + 52, { size: 14, align: 'left', color: '#8a6a50' });
      UI.zone('tocol', 18, y, W - 36, 74, () => App.go('collection'));
    }
  },
};

// ───────── 문방구 ─────────
export const ShopScene = {
  enter() { this.t = 0; this.tab = 'gacha'; this.reveal = null; },
  update(dt) { this.t += dt; if (this.reveal) this.reveal.t += dt; },
  doPull(mode) {
    const S = App.S;
    if (mode === 'ad') { S.adPullDay = dayKey(); S.coins += GACHA.price; }   // 광고 보상 = 1회 비용 지급 후 일반 뽑기
    const r = pull(S, Math.random, mode === 'ticket');
    if (!r) { Sound.play('error'); UI.toast(mode === 'ticket' ? '뽑기권이 없어요' : '코인이 부족해요'); return; }
    App.persist();
    track('gacha', { id: r.d.id, rarity: r.d.rarity, dup: r.dup, mode });
    this.reveal = { ...r, t: 0, fx: false };
    Sound.play('gacha');
  },
  draw(ctx) {
    const { W, H } = view, S = App.S;
    ctx.fillStyle = '#ffe3ea'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) { ctx.fillStyle = i & 1 ? '#ff6fb1' : '#fff'; ctx.beginPath(); ctx.moveTo(i * 36, 64); ctx.lineTo(i * 36 + 36, 64); ctx.lineTo(i * 36 + 36, 86); ctx.arc(i * 36 + 18, 86, 18, 0, Math.PI); ctx.fill(); }
    topBar(S, '행복 문방구', () => App.go('home'));
    const tw = (W - 50) / 2;
    UI.button('tab-g', 20, 112, tw, 44, '딱지 뽑기', { color: this.tab === 'gacha' ? '#ff6fb1' : '#fff', fg: this.tab === 'gacha' ? '#fff' : '#3a1f12', size: 20, onClick: () => { this.tab = 'gacha'; } });
    UI.button('tab-i', 30 + tw, 112, tw, 44, '아이템', { color: this.tab === 'items' ? '#ff6fb1' : '#fff', fg: this.tab === 'items' ? '#fff' : '#3a1f12', size: 20, onClick: () => { this.tab = 'items'; } });
    if (this.tab === 'gacha') this.drawGacha(ctx); else this.drawItems(ctx);
    if (this.reveal) this.drawReveal(ctx);
    if (Ads.busy) HomeScene.drawAd(ctx);
  },
  drawGacha(ctx) {
    const { W, H } = view, S = App.S, t = this.t;
    // 뽑기 기계
    const mx = W / 2, my = 190;
    ctx.fillStyle = '#d6283b'; rr(ctx, mx - 100, my + 170, 200, 120, 16); ctx.fill();
    ctx.strokeStyle = '#5a1018'; ctx.lineWidth = 3; rr(ctx, mx - 100, my + 170, 200, 120, 16); ctx.stroke();
    ctx.fillStyle = 'rgba(200,240,255,.55)'; ctx.beginPath(); ctx.arc(mx, my + 90, 100, 0, 7); ctx.fill(); ctx.strokeStyle = '#5a1018'; ctx.stroke();
    const cols = ['#ff6b6b', '#ffd447', '#4aa3ff', '#7bd67b', '#c06bff', '#ff9a3d'];
    for (let i = 0; i < 16; i++) {
      const a = i * 2.4 + Math.sin(t * 2 + i) * 0.05, rad = 30 + (i % 4) * 16;
      const x = mx + Math.cos(a) * rad, y = my + 120 - Math.abs(Math.sin(a)) * rad * 0.9;
      ctx.fillStyle = cols[i % 6]; ctx.beginPath(); ctx.arc(x, y, 14, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.stroke();
    }
    ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(mx + 50, my + 230, 22, 0, 7); ctx.fill(); ctx.strokeStyle = '#7a5200'; ctx.stroke();
    ctx.save(); ctx.translate(mx + 50, my + 230); ctx.rotate(t * (this.reveal && this.reveal.t < 0.8 ? 12 : 0.5)); ctx.fillStyle = '#7a5200'; ctx.fillRect(-16, -4, 32, 8); ctx.restore();
    ctx.fillStyle = '#2b1d14'; rr(ctx, mx - 70, my + 212, 60, 40, 8); ctx.fill();
    text(ctx, '딱지 뽑기', mx, my + 186, { size: 18, color: '#fff' });
    // 확률
    const r = GACHA.rates;
    text(ctx, `전설 ${Math.round(r.SSR * 100)}% · 영웅 ${Math.round(r.SR * 100)}% · 희귀 ${Math.round(r.R * 100)}% · 보통 ${Math.round(r.N * 100)}%`, W / 2, my + 312, { size: 13, color: '#8a4a60' });
    text(ctx, '중복 딱지는 코인으로 돌려받아요', W / 2, my + 332, { size: 13, color: '#8a4a60' });
    let by = my + 352;
    UI.button('pull', 30, by, W - 60, 60, `뽑기 ${GACHA.price}코인`, { color: '#ff6fb1', fg: '#fff', size: 24, disabled: S.coins < GACHA.price || !!this.reveal, onDisabled: () => UI.toast('코인이 부족해요'), sfx: 'coin', onClick: () => this.doPull('coin') });
    by += 72;
    const bw = (W - 70) / 2;
    UI.button('pullt', 30, by, bw, 54, '', { color: S.tickets ? '#ffe066' : '#d8d0e0', disabled: !S.tickets || !!this.reveal, icon: (c, x, y, s) => { ticket(c, x + bw / 2 - 40, y, s * 2); text(c, `뽑기권 ×${S.tickets}`, x + bw / 2 + 12, y + 1, { size: 18, color: '#3a1f12' }); }, onDisabled: () => UI.toast('출석 7일차에 뽑기권을 받아요'), onClick: () => this.doPull('ticket') });
    const adUsed = S.adPullDay === dayKey();
    UI.button('pulla', 40 + bw, by, bw, 54, adUsed ? '내일 다시' : '▶ 광고 무료뽑기', { color: adUsed ? '#d8d0e0' : '#7bd6ff', size: 17, disabled: adUsed || Ads.busy || !!this.reveal, onClick: async () => { if (await Ads.rewarded('gacha_free')) this.doPull('ad'); } });
  },
  drawItems(ctx) {
    const { W, H } = view, S = App.S;
    ITEM_ORDER.forEach((id, i) => {
      const info = ITEM_INFO[id], y = 176 + i * 104;
      UI.panel(18, y, W - 36, 92, { fill: '#fffaf3' });
      ctx.fillStyle = shade(info.color, 0.4); ctx.beginPath(); ctx.arc(62, y + 46, 30, 0, 7); ctx.fill();
      itemIcon(ctx, id, 62, y + 46, 22);
      text(ctx, info.name, 104, y + 28, { size: 21, align: 'left', color: '#3a1f12' });
      text(ctx, info.desc, 104, y + 54, { size: 14, align: 'left', color: '#8a6a50', maxW: W - 260 });
      text(ctx, `보유 ${S.items[id] || 0}개`, 104, y + 76, { size: 13, align: 'left', color: '#c0392b' });
      const can = S.coins >= info.price;
      UI.button('buy-' + id, W - 140, y + 20, 108, 54, `${info.price}`, { color: can ? '#ffcc33' : '#d8d0e0', size: 20, disabled: !can, sfx: 'buy', icon: (c, x, yy, s) => coin(c, x - 4, yy, s * 0.55), onDisabled: () => UI.toast('코인이 부족해요'), onClick: () => {
        if (buyItem(S, id)) { App.persist(); App.fx.float('+1', W - 86, y + 14, { color: '#4fb06d', size: 24 }); track('buy_item', { id }); }
      } });
    });
    text(ctx, '아이템은 대결 준비 화면에서 1개 고를 수 있어요', W / 2, 176 + 5 * 104 + 10, { size: 14, color: '#8a4a60' });
  },
  drawReveal(ctx) {
    const { W, H } = view, rv = this.reveal, t = rv.t, d = rv.d, rar = RARITY[d.rarity];
    UI.modal(0.75);
    const cx = W / 2, cy = H * 0.42;
    if (t < 1.0) {
      // 캡슐이 흔들리다가
      const sh = Math.sin(t * 40) * (t * 8);
      ctx.save(); ctx.translate(cx + sh, cy);
      ctx.fillStyle = rar.color; ctx.beginPath(); ctx.arc(0, 0, 60, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = '#2b1d14'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 60, 0, 7); ctx.moveTo(-60, 0); ctx.lineTo(60, 0); ctx.stroke();
      ctx.restore();
      text(ctx, '두근두근…', cx, cy + 110, { size: 24, color: '#fff' });
    } else {
      if (!rv.fx) {
        rv.fx = true;
        const big = d.rarity === 'SSR' || d.rarity === 'SR';
        Sound.play(big ? 'rare' : 'reveal'); App.fx.blink(rar.color, big ? 0.8 : 0.4);
        App.fx.burst(cx, cy, { n: big ? 60 : 30, colors: [rar.color, '#fff', '#ffe066'], shape: 'star', speed: big ? 420 : 280, size: 7, grav: 120 });
        if (d.rarity === 'SSR') App.fx.confetti(W, 80);
        Haptics.buzz(big ? [30, 30, 60] : 25);
      }
      const k = ease.outBack(Math.min(1, (t - 1) / 0.5));
      ctx.save(); ctx.translate(cx, cy);
      ctx.rotate(t * 0.6); ctx.fillStyle = rar.color; ctx.globalAlpha = 0.35;
      for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-20, -220); ctx.lineTo(20, -220); ctx.fill(); }
      ctx.restore(); ctx.globalAlpha = 1;
      drawDdakji(ctx, d, cx, cy, 80 * k, { rot: (1 - k) * 6, glow: rar.color, lift: 6 });
      text(ctx, `[${rar.name}]`, cx, cy - 120, { size: 24 * k, color: rar.color, stroke: '#2b1d14', sw: 5 });
      text(ctx, d.name, cx, cy + 118, { size: 30, color: '#fff', stroke: '#2b1d14', sw: 6, maxW: W - 30 });
      const b = Object.entries(d.bonus || {}).map(([k2, v]) => `${STAT_INFO[k2].name}+${v}`).join(' ');
      text(ctx, `방어 ${d.guard}${b ? ' · ' + b : ''}`, cx, cy + 152, { size: 18, color: '#ffe9c0' });
      if (rv.dup) text(ctx, `이미 있는 딱지! +${rv.refund} 코인`, cx, cy + 182, { size: 18, color: '#ffe066' });
      if (t > 1.4) {
        const S = App.S;
        if (!rv.dup) UI.button('equipnew', 40, H * 0.8, (W - 90) / 2, 56, '장착하기', { color: '#7bd67b', fg: '#fff', size: 20, onClick: () => { S.equipped = d.id; App.persist(); UI.toast(`${d.name} 장착!`); this.reveal = null; } });
        UI.button('revok', rv.dup ? 40 : 50 + (W - 90) / 2, H * 0.8, rv.dup ? W - 80 : (W - 90) / 2, 56, '확인', { color: '#ffcc33', size: 20, onClick: () => { this.reveal = null; } });
      }
    }
  },
};

// ───────── 딱지첩 ─────────
export const CollectionScene = {
  enter() { this.t = 0; this.sel = null; this.scroll = 0; this.drag = null; this.vy = 0; },
  contentH() { return 150 + Math.ceil(DDAKJI.length / 4) * 112 + 40; },
  clamp() { this.scroll = Math.max(0, Math.min(Math.max(0, this.contentH() - view.H), this.scroll)); },
  down(p) { if (!this.sel) { this.drag = { y: p.y, s: this.scroll, last: p.y, t: performance.now() }; this.vy = 0; } },
  move(p) { if (this.drag) { const now = performance.now(); this.vy = (this.drag.last - p.y) / Math.max(1, now - this.drag.t) * 1000; this.drag.last = p.y; this.drag.t = now; this.scroll = this.drag.s + (this.drag.y - p.y); this.clamp(); } },
  up() { this.drag = null; },
  wheel(dy) { this.scroll += dy; this.clamp(); },
  update(dt) { this.t += dt; if (this.sel) this.sel.t += dt; if (!this.drag && Math.abs(this.vy) > 5) { this.scroll += this.vy * dt; this.vy *= Math.pow(0.04, dt); this.clamp(); } },
  draw(ctx) {
    const { W, H } = view, S = App.S;
    ctx.fillStyle = '#3a5a3a'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(0, -this.scroll);
    text(ctx, `모은 딱지 ${collectionCount(S)} / ${DDAKJI.length}`, W / 2, 96, { size: 22, color: '#fff', stroke: '#1d2a1d', sw: 4 });
    text(ctx, '딱지를 눌러 장착 · 상대를 이기거나 문방구에서 뽑아요', W / 2, 124, { size: 14, color: '#d8f0c8' });
    const cw = (W - 30) / 4;
    DDAKJI.forEach((d, i) => {
      const x = 15 + (i % 4) * cw, y = 150 + Math.floor(i / 4) * 112;
      const own = (S.owned[d.id] || 0) > 0, eq = S.equipped === d.id;
      ctx.fillStyle = eq ? '#ffe066' : own ? '#f5ecdc' : 'rgba(0,0,0,.25)'; rr(ctx, x + 4, y, cw - 8, 104, 12); ctx.fill();
      if (own) {
        ctx.strokeStyle = RARITY[d.rarity].color; ctx.lineWidth = 3; rr(ctx, x + 4, y, cw - 8, 104, 12); ctx.stroke();
        drawDdakji(ctx, d, x + cw / 2, y + 42, 26, { rot: -0.1 });
        text(ctx, d.name, x + cw / 2, y + 88, { size: 12, color: '#3a1f12', maxW: cw - 14 });
        if (eq) text(ctx, '장착', x + 22, y + 12, { size: 12, color: '#c0392b' });
        if (S.owned[d.id] > 1) text(ctx, '×' + S.owned[d.id], x + cw - 18, y + 12, { size: 12, color: '#7a5a40' });
      } else {
        ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(ctx, x + cw / 2 - 26, y + 16, 52, 52, 6); ctx.fill();
        text(ctx, '?', x + cw / 2, y + 44, { size: 30, color: 'rgba(255,255,255,.4)' });
        text(ctx, d.src === 'gacha' ? '문방구 뽑기' : '상대에게 획득', x + cw / 2, y + 88, { size: 11, color: 'rgba(255,255,255,.55)', maxW: cw - 12 });
      }
      const top = y - this.scroll;
      if (top > 50 && top < H) UI.zone('dk-' + d.id, x + 4, top, cw - 8, 104, () => { if (own) this.sel = { d, t: 0 }; else UI.toast('아직 없는 딱지예요'); }, own ? 'tap' : 'error');
    });
    ctx.restore();
    topBar(S, '딱지첩', () => App.go('home'));
    if (this.sel) this.drawDetail(ctx);
  },
  drawDetail(ctx) {
    const { W, H } = view, S = App.S, d = this.sel.d, t = this.sel.t, rar = RARITY[d.rarity];
    UI.modal(0.65, () => { this.sel = null; });
    const ph = 470, py = (H - ph) / 2;
    UI.panel(24, py, W - 48, ph);
    const flip = Math.cos(t * 1.6);
    drawDdakji(ctx, d, W / 2, py + 130, 80, { flip, rot: -0.1, lift: 8, glow: d.rarity === 'SSR' ? rar.color : null });
    text(ctx, `[${rar.name}]`, W / 2, py + 240, { size: 18, color: rar.color });
    text(ctx, d.name, W / 2, py + 270, { size: 28, color: '#3a1f12', maxW: W - 70 });
    const b = Object.entries(d.bonus || {}).map(([k, v]) => `${STAT_INFO[k].name} +${v}`).join(' · ');
    text(ctx, `방어 ${d.guard} (상대 판정 -${Math.round((1 - guardMul(d.guard)) * 100)}%)`, W / 2, py + 306, { size: 17, color: '#7a5a40' });
    text(ctx, b ? `보너스: ${b}` : '보너스 없음', W / 2, py + 332, { size: 17, color: b ? '#c0392b' : '#a08a70' });
    const eq = S.equipped === d.id;
    UI.button('equip', 50, py + 362, W - 100, 56, eq ? '장착 중' : '장착하기', { color: eq ? '#cfc8d8' : '#7bd67b', fg: '#fff', size: 22, disabled: eq, onClick: () => { S.equipped = d.id; App.persist(); Sound.play('levelup'); UI.toast(`${d.name} 장착!`); this.sel = null; } });
    UI.button('dclose', 50, py + 426, W - 100, 34, '닫기', { color: '#e9e1d4', size: 16, onClick: () => { this.sel = null; } });
  },
};
