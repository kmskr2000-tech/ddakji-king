// 메뉴 씬: 타이틀, 홈, 지도(상대 선택), 대결 준비, 결과, 설정.
import { App } from './app.js?v=1792845191';
import { UI, view, topBar, ease } from './ui.js?v=1792845191';
import { text, rr, drawDdakji, drawKid, background, coin, ticket, itemIcon, crown, shade, star } from './gfx.js?v=1792845191';
import { REGIONS, OPPONENTS, OPP_BY_ID, DDAKJI_BY_ID, ITEM_INFO, ITEM_ORDER, RARITY, DAILY, DDAKJI } from './data.js?v=1792845191';
import { endlessUnlocked, endlessOpp, settleEndless, achPending } from './game.js?v=1792845191';
import { titleOf, nextOpponent, isUnlocked, isBeaten, regionUnlocked, regionCleared, settle, dailyPending, claimDaily, equippedDdakji, baseStats, collectionCount, playerGuard } from './game.js?v=1792845191';
import { guardMul } from './data.js?v=1792845191';
import { Sound } from './audio.js?v=1792845191';
import { Ads, track, share, Haptics } from './platform.js?v=1792845191';
import { ME_LOOK } from './scene-battle.js';

const AD_COIN_COOLDOWN = 10 * 60 * 1000;
const AD_COIN = 100;

// ───────── 타이틀 ─────────
export const TitleScene = {
  ownFx: true,
  enter() { this.t = 0; Sound.playMusic('title'); },
  update(dt) { this.t += dt; },
  draw(ctx) {
    const { W, H } = view, t = this.t;
    background(ctx, REGIONS[0], W, H, view.scale);
    ctx.fillStyle = 'rgba(20,10,40,.35)'; ctx.fillRect(0, 0, W, H);
    // 빙글 뒤집히는 딱지
    const k = (t % 2.6) / 2.6;
    const hop = k < 0.5 ? k / 0.5 : 1;
    const lift = Math.sin(hop * Math.PI) * 70;
    const d = DDAKJI_BY_ID[['o30', 'g10', 'g11', 'o5'][Math.floor(t / 2.6) % 4]];
    drawDdakji(ctx, d, W / 2, H * 0.5, 92, { rot: -0.1 + Math.sin(t) * 0.05 + hop * Math.PI * 2, flip: Math.cos(hop * Math.PI * 2), lift, glow: '#ffd447' });
    if (k > 0.49 && k < 0.53 && !this.burst) { this.burst = true; App.fx.burst(W / 2, H * 0.5, { n: 26, colors: ['#ffd447', '#fff', '#ff6b5b'], speed: 300, shape: 'star', size: 6, grav: 200 }); App.fx.kick(6); }
    if (k < 0.4) this.burst = false;
    // 로고
    const e = ease.outBack(Math.min(1, t / 0.7));
    ctx.save(); ctx.translate(W / 2, H * 0.2); ctx.scale(e, e); ctx.rotate(-0.04);
    crown(ctx, 70, -66, 58, '#ffd447');
    text(ctx, '딱지왕', 0, 0, { size: 84, color: '#ffe066', stroke: '#3a1f12', sw: 12, shadow: '#7a2a10' });
    text(ctx, '키우기', 40, 72, { size: 46, color: '#ffffff', stroke: '#3a1f12', sw: 9 });
    ctx.restore();
    App.fx.draw(ctx);
    const a = 0.55 + Math.sin(t * 4) * 0.45;
    ctx.globalAlpha = a;
    text(ctx, '화면을 터치해서 시작', W / 2, H * 0.78, { size: 26, color: '#fff', stroke: '#3a1f12', sw: 6 });
    ctx.globalAlpha = 1;
    text(ctx, '추억의 딱지치기로 동네 꼬마에서 전국 딱지왕까지!', W / 2, H * 0.84, { size: 15, color: '#ffe9c0', stroke: '#3a1f12', sw: 4, maxW: W - 30 });
    text(ctx, `v${String(window.__V || 'dev')} · © 딱지왕 키우기`, W / 2, H - 22, { size: 12, color: 'rgba(255,255,255,.6)' });
    UI.zone('start', 0, 0, W, H, () => App.go('home'), 'coin');
  },
};

// ───────── 홈 ─────────
export const HomeScene = {
  enter() {
    this.t = 0; this.modal = null;
    Sound.playMusic('home');
    const S = App.S;
    if (S.beaten.p30 && !S.endingSeen) this.modal = { kind: 'ending', t: 0 };
    else { const p = dailyPending(S); if (p) this.modal = { kind: 'daily', p, t: 0 }; }
  },
  update(dt) { this.t += dt; if (this.modal) this.modal.t += dt; },
  draw(ctx) {
    const { W, H } = view, S = App.S, t = this.t;
    const nxt = nextOpponent(S);
    const R = REGIONS[(nxt ? nxt.region : 6) - 1];
    background(ctx, R, W, H, view.scale);
    ctx.fillStyle = 'rgba(20,10,40,.25)'; ctx.fillRect(0, 0, W, H);
    // 상단
    ctx.fillStyle = 'rgba(20,12,30,.5)'; ctx.fillRect(0, 0, W, 64);
    UI.button('settings', 10, 12, 44, 40, '⚙', { color: '#ffffff', size: 22, radius: 12, onClick: () => { this.modal = { kind: 'settings', t: 0, confirm: 0 }; } });
    const pend = achPending(S);
    UI.button('ach', 60, 12, 44, 40, '🏆', { color: '#ffffff', size: 20, radius: 12, onClick: () => App.go('ach') });
    if (pend) { ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(100, 14, 9, 0, 7); ctx.fill(); text(ctx, String(pend), 100, 15, { size: 12, color: '#fff' }); }
    text(ctx, titleOf(S), 114, 24, { size: 14, align: 'left', color: '#ffd447' });
    text(ctx, '나의 딱지 인생', 114, 45, { size: 18, align: 'left', color: '#fff', stroke: '#2b1d14', sw: 4 });
    UI.wallet(S, W - 144, 15);
    // 플레이어 + 장착 딱지
    const d = equippedDdakji(S);
    const cy = H * 0.33;
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.ellipse(W / 2, cy + 100, 150, 30, 0, 0, 7); ctx.fill();
    drawKid(ctx, ME_LOOK, W / 2 - 92, cy + 10, 48, 'happy', t);
    drawDdakji(ctx, d, W / 2 + 60, cy + 30 + Math.sin(t * 2) * 4, 62, { rot: -0.12 + Math.sin(t * 1.3) * 0.04, lift: 10 + Math.sin(t * 2) * 6, glow: d.rarity === 'SSR' ? '#ffd447' : null });
    UI.zone('equipped', W / 2 - 10, cy - 40, 140, 140, () => App.go('collection'));
    text(ctx, d.name, W / 2 + 60, cy + 118, { size: 18, color: '#fff', stroke: '#2b1d14', sw: 4, maxW: 200 });
    // 진행 카드
    const st = baseStats(S);
    const cleared = OPPONENTS.filter((o) => isBeaten(S, o)).length;
    UI.panel(20, H * 0.53, W - 40, 92, { fill: 'rgba(255,248,230,.95)' });
    text(ctx, `힘 ${st.str}   집중 ${st.focus}   운 ${st.luck}   방어 ${d.guard}`, W / 2, H * 0.53 + 24, { size: 18, color: '#3a1f12' });
    ctx.fillStyle = '#e7d8bf'; rr(ctx, 40, H * 0.53 + 44, W - 80, 16, 8); ctx.fill();
    ctx.fillStyle = '#ff9a3d'; rr(ctx, 40, H * 0.53 + 44, Math.max(16, (W - 80) * cleared / OPPONENTS.length), 16, 8); ctx.fill();
    text(ctx, `진행도 ${cleared}/${OPPONENTS.length}  ·  딱지첩 ${collectionCount(S)}/${DDAKJI.length}`, W / 2, H * 0.53 + 76, { size: 15, color: '#7a5a40' });
    // 대결 버튼
    const by = H * 0.53 + 108;
    UI.button('play', 30, by, W - 60, 78, '대결하러 가기!', { color: '#ff6b5b', fg: '#fff', size: 30, sub: nxt ? `다음 상대: ${nxt.name}` : '모든 상대를 이겼다! 재대결로 코인 벌기', pulse: true, onClick: () => App.go('map') });
    // 메뉴
    const my = by + 98, bw = (W - 60 - 20) / 3;
    const canUp = ['str', 'focus', 'luck'].some((k) => S.stats[k] < 6 && S.coins >= [60, 150, 320, 600, 1000, 1600][S.stats[k]]);
    UI.button('upgrade', 30, my, bw, 64, '강화', { color: '#4aa3ff', fg: '#fff', size: 22, sub: canUp ? '강화 가능!' : '스탯 올리기', onClick: () => App.go('upgrade') });
    UI.button('shop', 40 + bw, my, bw, 64, '문방구', { color: '#ff6fb1', fg: '#fff', size: 22, sub: S.tickets ? '뽑기권 있음!' : '뽑기·아이템', onClick: () => App.go('shop') });
    UI.button('collection', 50 + bw * 2, my, bw, 64, '딱지첩', { color: '#7bd67b', fg: '#fff', size: 22, sub: '수집·장착', onClick: () => App.go('collection') });
    if (canUp) { ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(30 + bw - 6, my + 4, 8, 0, 7); ctx.fill(); }
    // 광고 보상
    const ay = my + 80;
    const left = AD_COIN_COOLDOWN - (Date.now() - S.adCoinLast);
    if (ay + 46 < H) {
      UI.button('adcoin', 30, ay, W - 60, 44, left > 0 ? `무료 코인 ${Math.ceil(left / 60000)}분 후` : `▶ 광고 보고 코인 +${AD_COIN}`, { color: left > 0 ? '#b8b0c8' : '#ffe066', size: 18, disabled: left > 0 || Ads.busy, onClick: async () => {
        const ok = await Ads.rewarded('home_coin');
        if (ok) { S.coins += AD_COIN; S.adCoinLast = Date.now(); App.persist(); Sound.play('coins'); UI.toast(`코인 +${AD_COIN}!`, '#ffe066'); }
      } });
    }
    if (Ads.busy) this.drawAd(ctx);
    if (this.modal) this.drawModal(ctx);
  },
  drawAd(ctx) {
    const { W, H } = view;
    UI.modal(0.85);
    text(ctx, '광고 재생 중…', W / 2, H / 2 - 10, { size: 26, color: '#fff' });
    text(ctx, Ads.isDev ? '(개발용 테스트 광고)' : '', W / 2, H / 2 + 26, { size: 15, color: '#aaa' });
  },
  drawModal(ctx) {
    const { W, H } = view, S = App.S, m = this.modal;
    const e = ease.outBack(Math.min(1, m.t / 0.35));
    if (m.kind === 'daily') {
      UI.modal(0.6);
      const ph = 360, py = (H - ph) / 2;
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(e, e); ctx.translate(-W / 2, -H / 2);
      UI.panel(24, py, W - 48, ph);
      text(ctx, '출석 보상', W / 2, py + 38, { size: 30, color: '#3a1f12' });
      text(ctx, `${m.p.streak}일 연속 출석!`, W / 2, py + 70, { size: 17, color: '#c0392b' });
      const cw = (W - 80) / 7;
      for (let i = 0; i < 7; i++) {
        const x = 40 + i * cw, y = py + 96, cur = i === m.p.idx, done = i < m.p.idx;
        ctx.fillStyle = cur ? '#ffe066' : done ? '#d9cbb3' : '#fff'; rr(ctx, x + 2, y, cw - 4, 84, 10); ctx.fill();
        ctx.strokeStyle = cur ? '#c0392b' : '#bba'; ctx.lineWidth = cur ? 3 : 1.5; rr(ctx, x + 2, y, cw - 4, 84, 10); ctx.stroke();
        text(ctx, `${i + 1}일`, x + cw / 2, y + 14, { size: 13, color: '#7a5a40' });
        if (DAILY[i] === 'ticket') { ticket(ctx, x + cw / 2, y + 44, 30); text(ctx, '뽑기권', x + cw / 2, y + 70, { size: 11, color: '#3a1f12' }); }
        else { coin(ctx, x + cw / 2, y + 42, 11); text(ctx, String(DAILY[i]), x + cw / 2, y + 70, { size: 13, color: '#3a1f12' }); }
        if (done) text(ctx, '✔', x + cw / 2, y + 44, { size: 28, color: '#4fb06d' });
      }
      const claim = (mul) => { claimDaily(S, m.p, mul); App.persist(); Sound.play('daily'); Sound.play('coins'); App.fx.burst(W / 2, py + 140, { n: 30, colors: ['#ffe066', '#fff'], shape: 'star', speed: 300, size: 6 }); UI.toast(m.p.reward === 'ticket' ? `뽑기권 +${mul}!` : `코인 +${m.p.reward * mul}!`, '#ffe066'); track('daily_claim', { streak: m.p.streak, mul }); this.modal = null; };
      UI.button('claim2', 44, py + 200, W - 88, 60, '▶ 광고 보고 2배 받기', { color: '#ffe066', size: 22, onClick: async () => { if (await Ads.rewarded('daily_x2')) claim(2); } });
      UI.button('claim1', 44, py + 276, W - 88, 52, '그냥 받기', { color: '#ffffff', size: 20, onClick: () => claim(1) });
      ctx.restore();
    } else if (m.kind === 'settings') {
      UI.modal(0.6, () => { this.modal = null; });
      const canInstall = App.install?.canInstall?.();
      const ph = canInstall ? 530 : 470, py = (H - ph) / 2, st = S.settings;
      UI.panel(30, py, W - 60, ph);
      text(ctx, '설정', W / 2, py + 36, { size: 30, color: '#3a1f12' });
      const row = (id, label, on, y, fn) => {
        text(ctx, label, 60, y + 24, { size: 21, color: '#3a1f12', align: 'left' });
        UI.button(id, W - 160, y, 100, 46, on ? '켜짐' : '꺼짐', { color: on ? '#7bd67b' : '#cfc8d8', size: 19, onClick: fn });
      };
      row('sfx', '효과음', st.sfx, py + 70, () => { st.sfx = !st.sfx; App.applySettings(); App.persist(); });
      row('music', '배경음악', st.music, py + 128, () => { st.music = !st.music; App.applySettings(); App.persist(); });
      row('vib', '진동', st.vib, py + 186, () => { st.vib = !st.vib; App.applySettings(); App.persist(); Haptics.buzz(30); });
      const r = S.record;
      text(ctx, `전적 ${r.wins}승 ${r.losses}패 · 뒤집기 ${r.flips} · 완벽 버티기 ${r.perfectBlocks}`, W / 2, py + 262, { size: 14, color: '#7a5a40', maxW: W - 90 });
      UI.button('share', 60, py + 284, W - 120, 46, '친구에게 자랑하기', { color: '#4aa3ff', fg: '#fff', size: 19, onClick: async () => {
        const res = await share(`나는 「${titleOf(S)}」! 딱지 ${collectionCount(S)}장 모았다. 딱지왕 키우기에서 한 판 붙자!`);
        if (res === 'copied') UI.toast('링크를 복사했어요');
      } });
      const lbl = ['데이터 초기화', '정말 초기화할까요?', '되돌릴 수 없어요! 한 번 더'][m.confirm];
      UI.button('reset', 60, py + 344, W - 120, 46, lbl, { color: m.confirm ? '#ff5d5d' : '#e9e1d4', fg: m.confirm ? '#fff' : '#7a5a40', size: 18, onClick: () => {
        if (m.confirm < 2) { m.confirm++; return; }
        App.resetAll(); this.modal = null; UI.toast('처음부터 다시 시작해요'); App.go('title');
      } });
      if (canInstall) UI.button('install', 60, py + 460, W - 120, 46, '홈 화면에 설치하기', { color: '#7bd67b', fg: '#fff', size: 19, onClick: async () => { if (await App.install.prompt()) { track('pwa_install'); UI.toast('설치 완료!'); } } });
      UI.button('close', 60, py + 402, W - 120, 48, '닫기', { color: '#ffcc33', size: 20, onClick: () => { this.modal = null; } });
      text(ctx, `버전 ${window.__V || 'dev'}`, W / 2, py + ph + 18, { size: 12, color: 'rgba(255,255,255,.7)' });
      UI.zone('privacy', W / 2 - 80, py + ph + 30, 160, 26, () => { window.open('privacy.html', '_blank', 'noopener'); });
      text(ctx, '개인정보처리방침', W / 2, py + ph + 43, { size: 13, color: '#bfe9ff' });
    } else if (m.kind === 'ending') {
      UI.modal(0.75);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(e, e); ctx.translate(-W / 2, -H / 2);
      UI.panel(24, H * 0.18, W - 48, H * 0.62, { fill: '#2b2050', stroke: '#ffd447' });
      crown(ctx, W / 2, H * 0.27, 90, '#ffd447');
      text(ctx, '축하합니다!', W / 2, H * 0.37, { size: 36, color: '#ffe066', stroke: '#000', sw: 5 });
      const lines = ['동네 꼬마였던 당신이', '마침내 전국 딱지왕이 되었습니다.', '', '하지만 딱지첩은 아직 비어 있다…', '모든 딱지를 모아 진정한 왕이 되자!'];
      lines.forEach((l, i) => text(ctx, l, W / 2, H * 0.44 + i * 28, { size: 18, color: '#fff' }));
      UI.button('endok', 60, H * 0.68, W - 120, 56, '계속하기', { color: '#ffd447', size: 22, onClick: () => { S.endingSeen = true; S.coins += 1000; S.tickets += 3; App.persist(); Sound.play('coins'); UI.toast('엔딩 보상: 코인 1000 + 뽑기권 3', '#ffe066'); this.modal = null; } });
      ctx.restore();
      if (Math.random() < 0.15) App.fx.confetti(W, 2);
    }
  },
};

// ───────── 지도 (상대 선택) ─────────
const ROW_H = 84, HEAD_H = 74;
export const MapScene = {
  enter(p = {}) {
    this.t = 0; this.sel = null; this.vy = 0; this.drag = null;
    Sound.playMusic('home');
    const pre = p.sel === 'endless' ? (endlessUnlocked(App.S) ? endlessOpp(App.S) : null) : p.sel && OPP_BY_ID[p.sel];
    if (pre && (pre.endless || isUnlocked(App.S, pre))) this.sel = { o: pre, item: '', t: 0 };
    const nxt = pre || nextOpponent(App.S);
    this.scroll = 0;
    if (nxt && !nxt.endless) this.scroll = Math.max(0, this.rowY(nxt) - view.H * 0.35);
    else if (!nxt || nxt.endless) this.scroll = this.contentH();
    this.clampScroll();
  },
  rowY(o) { return 80 + (o.region - 1) * (HEAD_H + 5 * ROW_H + 16) + HEAD_H + o.idx * ROW_H; },
  contentH() { return 80 + 6 * (HEAD_H + 5 * ROW_H + 16) + 140; },
  clampScroll() { this.scroll = Math.max(0, Math.min(this.contentH() - view.H, this.scroll)); },
  down(p) { if (!this.sel) { this.drag = { y: p.y, s: this.scroll, last: p.y, t: performance.now() }; this.vy = 0; } },
  move(p) { if (this.drag) { const now = performance.now(); this.vy = (this.drag.last - p.y) / Math.max(1, now - this.drag.t) * 1000; this.drag.last = p.y; this.drag.t = now; this.scroll = this.drag.s + (this.drag.y - p.y); this.clampScroll(); } },
  up() { this.drag = null; },
  wheel(dy) { this.scroll += dy; this.clampScroll(); },
  update(dt) { this.t += dt; if (!this.drag && Math.abs(this.vy) > 5) { this.scroll += this.vy * dt; this.vy *= Math.pow(0.04, dt); this.clampScroll(); } if (this.sel) this.sel.t += dt; },
  draw(ctx) {
    const { W, H } = view, S = App.S;
    ctx.fillStyle = '#2b2640'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(0, -this.scroll);
    for (const R of REGIONS) {
      const y0 = 80 + (R.id - 1) * (HEAD_H + 5 * ROW_H + 16);
      if (y0 > this.scroll + H || y0 + HEAD_H + 5 * ROW_H < this.scroll) continue;
      const un = regionUnlocked(S, R.id);
      // 지역 헤더
      const g = ctx.createLinearGradient(0, y0, W, y0);
      g.addColorStop(0, un ? R.sky[0] : '#555'); g.addColorStop(1, un ? R.accent : '#444');
      ctx.fillStyle = g; rr(ctx, 12, y0, W - 24, HEAD_H - 8, 14); ctx.fill();
      ctx.strokeStyle = '#2b1d14'; ctx.lineWidth = 2; rr(ctx, 12, y0, W - 24, HEAD_H - 8, 14); ctx.stroke();
      text(ctx, `${R.id}. ${R.name}`, 28, y0 + 24, { size: 23, align: 'left', color: '#fff', stroke: '#2b1d14', sw: 5 });
      text(ctx, un ? R.sub + (R.gust ? ' · 돌풍' : '') : '이전 지역 보스를 이기면 열려요', 28, y0 + 50, { size: 14, align: 'left', color: '#fff', stroke: '#2b1d14', sw: 3 });
      if (regionCleared(S, R.id)) text(ctx, '정복!', W - 40, y0 + 33, { size: 20, color: '#ffe066', stroke: '#2b1d14', sw: 4, align: 'right' });
      for (const o of OPPONENTS.filter((q) => q.region === R.id)) this.drawRow(ctx, o, this.rowY(o));
    }
    this.drawEndless(ctx, 80 + 6 * (HEAD_H + 5 * ROW_H + 16));
    ctx.restore();
    topBar(S, '상대 고르기', () => App.go('home'));
    if (this.sel) this.drawPrep(ctx);
  },
  drawEndless(ctx, y) {
    const { W, H } = view, S = App.S, un = endlessUnlocked(S);
    const g = ctx.createLinearGradient(0, y, W, y + 110);
    g.addColorStop(0, un ? '#3b2a7a' : '#444'); g.addColorStop(1, un ? '#c73a2b' : '#333');
    ctx.fillStyle = g; rr(ctx, 12, y, W - 24, 110, 16); ctx.fill();
    ctx.strokeStyle = un ? '#ffd447' : '#666'; ctx.lineWidth = 3; rr(ctx, 12, y, W - 24, 110, 16); ctx.stroke();
    text(ctx, '∞ 무한 도장깨기', 30, y + 30, { size: 26, align: 'left', color: un ? '#ffe066' : '#aaa', stroke: '#2b1d14', sw: 5 });
    text(ctx, un ? `연승 ${S.endless.streak} · 최고 ${S.endless.best}연승 · 이길수록 강해진다` : '딱지왕을 이기면 열려요', 30, y + 62, { size: 15, align: 'left', color: '#fff', maxW: W - 70 });
    if (un) text(ctx, '도전하기 ▶', W - 36, y + 90, { size: 18, align: 'right', color: '#fff' });
    const top = y - this.scroll;
    if (un && top > 60 && top < H - 20) UI.zone('endless', 12, top, W - 24, 110, () => { this.sel = { o: endlessOpp(S), item: '', t: 0 }; });
  },
  drawRow(ctx, o, y) {
    const { W, H } = view, S = App.S;
    const un = isUnlocked(S, o), won = S.beaten[o.id] || 0;
    const nxt = un && !won;
    ctx.fillStyle = nxt ? '#fff3c4' : un ? '#f5ecdc' : '#4a4458';
    rr(ctx, 20, y + 4, W - 40, ROW_H - 10, 14); ctx.fill();
    if (nxt) { ctx.strokeStyle = '#ff6b5b'; ctx.lineWidth = 3 + Math.sin(this.t * 5); rr(ctx, 20, y + 4, W - 40, ROW_H - 10, 14); ctx.stroke(); }
    if (un) drawKid(ctx, o.look, 58, y + 34, 22, won ? 'sad' : 'normal', this.t + o.n);
    else { ctx.fillStyle = '#2b2640'; ctx.beginPath(); ctx.arc(58, y + 38, 24, 0, 7); ctx.fill(); text(ctx, '?', 58, y + 40, { size: 26, color: '#777' }); }
    text(ctx, (o.boss ? '★ ' : '') + (un ? o.name : '???'), 92, y + 26, { size: 19, align: 'left', color: un ? '#3a1f12' : '#888', maxW: 190 });
    text(ctx, un ? o.quote : '앞 상대를 이겨야 도전 가능', 92, y + 52, { size: 13, align: 'left', color: un ? '#8a6a50' : '#777', maxW: 190 });
    if (un) {
      coin(ctx, W - 96, y + 26, 9);
      text(ctx, String(won ? Math.round(o.reward * 0.5) : o.reward), W - 82, y + 27, { size: 16, align: 'left', color: '#7a5200' });
      if (won) text(ctx, `${won}승`, W - 60, y + 54, { size: 14, color: '#4fb06d' });
      else drawDdakji(ctx, DDAKJI_BY_ID[o.ddakji], W - 60, y + 56, 11, { shadow: false });
    } else text(ctx, '🔒', W - 60, y + 40, { size: 22 });
    const top = y - this.scroll;
    if (un && top > 60 && top < H - 20) UI.zone('opp-' + o.id, 20, top + 4, W - 40, ROW_H - 10, () => { this.sel = { o, item: '', t: 0 }; });
  },
  drawPrep(ctx) {
    const { W, H } = view, S = App.S, sel = this.sel, o = sel.o;
    UI.modal(0.6, () => { this.sel = null; });
    const ph = 540, py = Math.max(70, (H - ph) / 2);
    const e = ease.outBack(Math.min(1, sel.t / 0.3));
    ctx.save(); ctx.translate(W / 2, py + ph / 2); ctx.scale(e, e); ctx.translate(-W / 2, -(py + ph / 2));
    UI.panel(16, py, W - 32, ph);
    drawKid(ctx, o.look, 84, py + 76, 44, 'angry', this.t);
    text(ctx, o.endless ? `무한 도장깨기 · 현재 ${S.endless.streak}연승` : (o.boss ? '★ BOSS ' : '') + REGIONS[o.region - 1].name, 144, py + 34, { size: 14, align: 'left', color: '#c0392b' });
    text(ctx, o.name, 144, py + 62, { size: 24, align: 'left', color: '#3a1f12', maxW: W - 180 });
    text(ctx, `“${o.quote}”`, 144, py + 92, { size: 15, align: 'left', color: '#8a6a50', maxW: W - 180 });
    text(ctx, `힘 ${o.stats.str} · 집중 ${o.stats.focus} · 운 ${o.stats.luck} · 딱지 ${o.lives}장`, W / 2, py + 142, { size: 16, color: '#3a1f12' });
    // 난이도 추정
    const st = baseStats(S), mine = st.str + st.focus + st.luck + equippedDdakji(S).guard * 1.5;
    const theirs = o.stats.str + o.stats.focus + o.stats.luck + DDAKJI_BY_ID[o.ddakji].guard * 1.5 + o.skill * 6;
    const diff = mine - theirs;
    const [dl, dc] = diff >= 2 ? ['쉬움', '#4fb06d'] : diff >= -2 ? ['보통', '#e0a800'] : diff >= -6 ? ['어려움', '#ff6b5b'] : ['매우 어려움', '#b0182b'];
    text(ctx, `예상 난이도: ${dl}`, W / 2, py + 170, { size: 18, color: dc });
    // 보상
    const won = isBeaten(S, o);
    ctx.fillStyle = '#f3e3c3'; rr(ctx, 36, py + 190, W - 72, 74, 12); ctx.fill();
    coin(ctx, 62, py + 214, 11);
    text(ctx, `승리 시 ${won ? Math.round(o.reward * 0.5) : o.reward} 코인`, 80, py + 215, { size: 18, align: 'left', color: '#3a1f12' });
    if (o.endless) text(ctx, '지면 연승 기록이 끊겨요!', 80, py + 245, { size: 15, align: 'left', color: '#c0392b' });
    else if (!won) { drawDdakji(ctx, DDAKJI_BY_ID[o.ddakji], 62, py + 244, 12, { shadow: false }); text(ctx, `+ ${DDAKJI_BY_ID[o.ddakji].name} 획득`, 80, py + 245, { size: 16, align: 'left', color: RARITY[DDAKJI_BY_ID[o.ddakji].rarity].color, maxW: W - 130 }); }
    else text(ctx, '재대결 (보상 50%)', 80, py + 245, { size: 15, align: 'left', color: '#8a6a50' });
    // 아이템 선택
    text(ctx, '아이템 1개 사용 (선택)', W / 2, py + 290, { size: 16, color: '#3a1f12' });
    const iw = (W - 72) / 5;
    ITEM_ORDER.forEach((id, i) => {
      const x = 36 + i * iw, y = py + 306, n = S.items[id] || 0, on = sel.item === id;
      ctx.fillStyle = on ? '#ffe066' : n ? '#fff' : '#ddd'; rr(ctx, x + 3, y, iw - 6, 74, 10); ctx.fill();
      ctx.strokeStyle = on ? '#c0392b' : '#bba'; ctx.lineWidth = on ? 3 : 1.5; rr(ctx, x + 3, y, iw - 6, 74, 10); ctx.stroke();
      ctx.globalAlpha = n ? 1 : 0.4; itemIcon(ctx, id, x + iw / 2, y + 28, 16); ctx.globalAlpha = 1;
      text(ctx, ITEM_INFO[id].name, x + iw / 2, y + 54, { size: 11, color: '#3a1f12', maxW: iw - 10 });
      text(ctx, `×${n}`, x + iw - 12, y + 10, { size: 12, color: '#7a5a40' });
      UI.zone('item-' + id, x + 3, y, iw - 6, 74, () => { if (!n) { UI.toast('문방구에서 살 수 있어요'); return; } sel.item = on ? '' : id; }, n ? 'tap' : 'error');
    });
    text(ctx, sel.item ? ITEM_INFO[sel.item].desc : '아이템 없이 도전', W / 2, py + 400, { size: 15, color: '#c0392b' });
    UI.button('fight', 40, py + 420, W - 80, 64, '도전!', { color: '#ff6b5b', fg: '#fff', size: 30, pulse: true, sfx: 'coin', onClick: () => App.go('battle', { opp: o.id, oppObj: o.endless ? o : undefined, item: sel.item }) });
    UI.button('cancel', 40, py + 494, W - 80, 34, '닫기', { color: '#e9e1d4', size: 16, onClick: () => { this.sel = null; } });
    ctx.restore();
  },
};

// ───────── 결과 ─────────
export const ResultScene = {
  enter(p) {
    this.p = p; this.t = 0; this.doubled = false;
    const o = p.oppObj || OPP_BY_ID[p.opp];
    this.o = o;
    this.r = (o.endless ? settleEndless : settle)(App.S, o, { win: p.win, flips: p.flips, crits: p.crits });
    if (!App.S.tutorial) App.S.tutorial = true;
    App.persist();
    this.shown = 0;
    track('battle_end', { opp: o.id, win: p.win, coins: this.r.coins, first: this.r.first });
    Sound.playMusic('home');
    if (p.win) App.fx.confetti(view.W, 60);
  },
  update(dt) {
    this.t += dt;
    const target = this.r.coins * (this.doubled ? 2 : 1);
    if (this.t > 0.6 && this.shown < target) { const prev = this.shown; this.shown = Math.min(target, this.shown + Math.max(1, target * dt * 1.4)); if (Math.floor(prev / 10) !== Math.floor(this.shown / 10)) Sound.play('tick'); }
  },
  draw(ctx) {
    const { W, H } = view, S = App.S, p = this.p, o = this.o, t = this.t;
    background(ctx, REGIONS[o.region - 1], W, H, view.scale);
    ctx.fillStyle = 'rgba(20,10,40,.55)'; ctx.fillRect(0, 0, W, H);
    const e = ease.outBack(Math.min(1, t / 0.5));
    text(ctx, p.win ? '승리!' : '패배…', W / 2, H * 0.12, { size: 64 * e, color: p.win ? '#ffe066' : '#9fb4ff', stroke: '#2b1d14', sw: 9 });
    drawKid(ctx, o.look, W / 2, H * 0.27, 50, p.win ? 'sad' : 'happy', t);
    text(ctx, p.win ? `${o.name}: “으앙, 다음엔 안 질 거야!”` : `${o.name}: “헤헤, 더 연습하고 와!”`, W / 2, H * 0.27 + 92, { size: 16, color: '#fff', stroke: '#2b1d14', sw: 4, maxW: W - 30 });
    // 보상 패널
    const py = H * 0.42;
    UI.panel(24, py, W - 48, 210, { fill: 'rgba(255,248,230,.97)' });
    text(ctx, '보상', W / 2, py + 26, { size: 22, color: '#3a1f12' });
    coin(ctx, W / 2 - 70, py + 66, 16);
    text(ctx, `+${Math.floor(this.shown)}`, W / 2 - 46, py + 67, { size: 32, color: '#b8860b', align: 'left' });
    if (this.doubled) text(ctx, '×2!', W / 2 + 90, py + 67, { size: 24, color: '#c0392b' });
    text(ctx, `뒤집기 ${p.flips} · 크리티컬 ${p.crits} · 완벽 버티기 ${p.perfect}`, W / 2, py + 104, { size: 15, color: '#7a5a40' });
    if (this.r.drop) {
      const d = DDAKJI_BY_ID[this.r.drop], k = Math.max(0, Math.min(1, (t - 0.8) / 0.5));
      drawDdakji(ctx, d, 80, py + 160, 26 * ease.outBack(k), { rot: (1 - k) * 4, glow: RARITY[d.rarity].color });
      text(ctx, '딱지 획득!', 122, py + 146, { size: 16, align: 'left', color: '#c0392b' });
      text(ctx, `${d.name} [${RARITY[d.rarity].name}]`, 122, py + 172, { size: 17, align: 'left', color: RARITY[d.rarity].color, maxW: W - 170 });
    } else if (o.endless) {
      text(ctx, p.win ? `${S.endless.streak}연승! (최고 ${S.endless.best})` : `연승 끝… 최고 기록 ${S.endless.best}연승`, W / 2, py + 160, { size: 20, color: p.win ? '#c0392b' : '#4a5a8a' });
    } else if (!p.win) {
      const tips = ['강화에서 힘을 올리면 판정 원이 커져요', '집중을 올리면 조준점이 덜 흔들려요', '방어가 높은 딱지를 장착해 보세요', '상대 차례엔 타이밍 맞춰 터치해서 버티세요', '아이템을 쓰면 훨씬 유리해요'];
      text(ctx, '💡 ' + tips[(o.n + S.record.losses) % tips.length], W / 2, py + 160, { size: 15, color: '#3a1f12', maxW: W - 80 });
    } else text(ctx, '재대결 보상', W / 2, py + 160, { size: 15, color: '#8a6a50' });
    // 버튼
    let by = py + 230;
    if (this.r.coins > 0 && !this.doubled) {
      UI.button('ad2x', 30, by, W - 60, 58, `▶ 광고 보고 코인 2배 (+${this.r.coins})`, { color: '#ffe066', size: 20, disabled: Ads.busy, onClick: async () => {
        if (await Ads.rewarded('result_x2')) { S.coins += this.r.coins; this.doubled = true; App.persist(); Sound.play('coins'); }
      } });
      by += 72;
    }
    const nxt = nextOpponent(S);
    const bw = (W - 70) / 2;
    UI.button('retry', 30, by, bw, 58, o.endless && p.win ? '다음 도전자' : '다시 하기', { color: '#4aa3ff', fg: '#fff', size: 21, onClick: () => App.go('map', { sel: o.id }) });
    if (o.endless) UI.button('upg', 40 + bw, by, bw, 58, '강화하러', { color: '#7bd67b', fg: '#fff', size: 21, onClick: () => App.go('upgrade') });
    else if (p.win && nxt && nxt.id !== o.id) UI.button('next', 40 + bw, by, bw, 58, '다음 상대', { color: '#ff6b5b', fg: '#fff', size: 21, pulse: true, onClick: () => App.go('map', { sel: nxt.id }) });
    else UI.button('upg', 40 + bw, by, bw, 58, p.win ? '홈으로' : '강화하러', { color: '#7bd67b', fg: '#fff', size: 21, onClick: () => App.go(p.win ? 'home' : 'upgrade') });
    UI.button('home', 30, by + 70, W - 60, 44, '홈', { color: '#ffffff', size: 18, onClick: () => App.go('home') });
    if (Ads.busy) HomeScene.drawAd(ctx);
  },
};
