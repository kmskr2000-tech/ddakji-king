// 도전과제 씬
import { App } from './app.js?v=1792845490';
import { UI, view, topBar } from './ui.js?v=1792845490';
import { text, rr, coin, ticket } from './gfx.js?v=1792845490';
import { ACHIEVEMENTS } from './data.js?v=1792845490';
import { achStat, achReady, claimAch } from './game.js?v=1792845490';
import { Sound } from './audio.js?v=1792845490';
import { track } from './platform.js?v=1792845490';

const ROW = 86;

export const AchScene = {
  enter() { this.t = 0; this.scroll = 0; this.drag = null; this.vy = 0; },
  contentH() { return 84 + ACHIEVEMENTS.length * ROW + 20; },
  clamp() { this.scroll = Math.max(0, Math.min(Math.max(0, this.contentH() - view.H), this.scroll)); },
  down(p) { this.drag = { y: p.y, s: this.scroll, last: p.y, t: performance.now() }; this.vy = 0; },
  move(p) { if (this.drag) { const now = performance.now(); this.vy = (this.drag.last - p.y) / Math.max(1, now - this.drag.t) * 1000; this.drag.last = p.y; this.drag.t = now; this.scroll = this.drag.s + (this.drag.y - p.y); this.clamp(); } },
  up() { this.drag = null; },
  wheel(dy) { this.scroll += dy; this.clamp(); },
  update(dt) { this.t += dt; if (!this.drag && Math.abs(this.vy) > 5) { this.scroll += this.vy * dt; this.vy *= Math.pow(0.04, dt); this.clamp(); } },
  draw(ctx) {
    const { W, H } = view, S = App.S;
    ctx.fillStyle = '#4a3a2a'; ctx.fillRect(0, 0, W, H);
    // 준비된 것 먼저, 그다음 진행 중, 수령 완료는 아래
    const order = ACHIEVEMENTS.map((a) => ({ a, k: achReady(S, a) ? 0 : S.ach[a.id] ? 2 : 1 })).sort((x, y) => x.k - y.k);
    ctx.save(); ctx.translate(0, -this.scroll);
    order.forEach(({ a, k }, i) => {
      const y = 84 + i * ROW;
      if (y - this.scroll > H || y + ROW - this.scroll < 0) return;
      const cur = Math.min(a.n, achStat(S, a.stat));
      ctx.fillStyle = k === 0 ? '#fff3c4' : k === 2 ? '#bfb3a3' : '#f5ecdc';
      rr(ctx, 16, y, W - 32, ROW - 10, 14); ctx.fill();
      if (k === 0) { ctx.strokeStyle = '#ff9a3d'; ctx.lineWidth = 3; rr(ctx, 16, y, W - 32, ROW - 10, 14); ctx.stroke(); }
      text(ctx, (k === 2 ? '✔ ' : '🏆 ') + a.name, 32, y + 22, { size: 19, align: 'left', color: '#3a1f12', maxW: W - 190 });
      text(ctx, a.desc, 32, y + 46, { size: 13, align: 'left', color: '#8a6a50', maxW: W - 190 });
      ctx.fillStyle = '#e2d6c2'; rr(ctx, 32, y + 58, W - 210, 10, 5); ctx.fill();
      ctx.fillStyle = k === 2 ? '#8a8a8a' : '#4fb06d'; rr(ctx, 32, y + 58, Math.max(10, (W - 210) * cur / a.n), 10, 5); ctx.fill();
      text(ctx, `${cur}/${a.n}`, W - 166, y + 63, { size: 12, align: 'left', color: '#7a5a40' });
      const top = y - this.scroll;
      const label = a.tickets ? `${a.coins}+🎟${a.tickets}` : String(a.coins);
      if (k === 0 && top > 60) {
        UI.button('ach-' + a.id, W - 128, top + 14, 100, 50, '받기', { color: '#ffcc33', size: 20, sub: label, sfx: 'coins', onClick: () => {
          if (claimAch(S, a)) { App.persist(); App.fx.burst(W - 78, top + 40, { n: 26, colors: ['#ffe066', '#fff'], shape: 'star', speed: 260, size: 6 }); App.fx.float(`+${a.coins}`, W - 78, top + 10, { color: '#ffe066' }); track('achievement', { id: a.id }); }
        } });
      } else if (k === 1) {
        coin(ctx, W - 108, y + 38, 10);
        text(ctx, String(a.coins), W - 94, y + 39, { size: 16, align: 'left', color: '#7a5200' });
        if (a.tickets) { ticket(ctx, W - 50, y + 38, 22); }
      } else if (k === 2) text(ctx, '완료', W - 78, y + 38, { size: 18, color: '#6a6a6a' });
    });
    ctx.restore();
    topBar(S, '도전과제', () => App.go('home'));
  },
};
