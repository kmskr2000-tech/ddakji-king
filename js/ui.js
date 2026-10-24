// 즉시모드 UI: 매 프레임 버튼을 그리며 등록 → 다음 입력 때 히트테스트. 모달은 layer로 위 버튼만 받는다.
import { rr, text, shade, coin, ticket } from './gfx.js?v=1792845610';

export const view = { W: 420, H: 800, scale: 1 };

const cur = [];   // 이번 프레임 등록
let last = [];    // 직전 프레임 (히트테스트 대상)
let topLayer = 0, curTop = 0;
export const pointer = { x: 0, y: 0, down: false, sx: 0, sy: 0, moved: false };
let pressed = null;
let toastMsg = null;

export const UI = {
  layer: 0,
  t: 0,
  sfx: null,       // (name) => void, main에서 주입
  begin() { cur.length = 0; curTop = 0; this.layer = 0; },
  end() { last = cur.slice(); topLayer = curTop; },
  hit(x, y) {
    for (let i = last.length - 1; i >= 0; i--) {
      const b = last[i];
      if (b.layer < topLayer) continue;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    }
    return null;
  },
  // 버튼 위가 아니어도 현재 최상위 레이어가 모달인지
  get modalOpen() { return topLayer > 0; },
  down(x, y) {
    Object.assign(pointer, { x, y, sx: x, sy: y, down: true, moved: false });
    const b = this.hit(x, y);
    pressed = b && !b.disabled ? b.id : (b && b.disabled ? '__disabled:' + b.id : null);
    return !!b || topLayer > 0;
  },
  move(x, y) {
    pointer.x = x; pointer.y = y;
    if (pointer.down && Math.hypot(x - pointer.sx, y - pointer.sy) > 10) { pointer.moved = true; if (pressed && !pressed.startsWith('__')) pressed = null; }
  },
  up(x, y) {
    pointer.down = false;
    const id = pressed; pressed = null;
    if (!id) return false;
    const b = this.hit(x, y);
    if (id.startsWith('__disabled:')) { if (b && b.id === id.slice(11)) { this.sfx?.('error'); b.onDisabled?.(); } return true; }
    if (b && b.id === id) { this.sfx?.(b.sfx ?? 'button'); b.onClick?.(); return true; }
    return true;
  },
  isPressed(id) { return pressed === id; },
  pressedAny() { return !!pressed; },
  find(id) { const b = last.find((q) => q.id === id); return b && { x: b.x + b.w / 2, y: b.y + b.h / 2, disabled: !!b.disabled }; },  // 테스트용

  // 버튼. 반환값 없음 — 클릭은 onClick
  button(id, x, y, w, h, label, o = {}) {
    const { color = '#ffcc33', fg = '#3a1f12', size = 22, disabled = false, onClick, onDisabled, icon, sub, sfx, radius = 14, pulse = false } = o;
    cur.push({ id, x, y, w, h, onClick, onDisabled, disabled, sfx, layer: this.layer });
    if (this.layer > curTop) curTop = this.layer;
    const ctx = this.ctx;
    const down = pressed === id;
    const base = disabled ? '#8a8494' : color;
    const edge = 5, dy = down ? edge - 1 : 0;
    let sc = 1;
    if (pulse && !disabled && !down) sc = 1 + Math.sin(this.t * 6) * 0.025;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc, sc); ctx.translate(-(x + w / 2), -(y + h / 2));
    ctx.fillStyle = 'rgba(0,0,0,.25)'; rr(ctx, x, y + edge + 2, w, h, radius); ctx.fill();
    ctx.fillStyle = shade(base.startsWith('#') ? base : '#888888', -0.35); rr(ctx, x, y + edge, w, h, radius); ctx.fill();
    ctx.fillStyle = base; rr(ctx, x, y + dy, w, h, radius); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.28)'; rr(ctx, x + 4, y + dy + 3, w - 8, h * 0.4, radius - 4); ctx.fill();
    ctx.strokeStyle = 'rgba(40,20,10,.55)'; ctx.lineWidth = 2; rr(ctx, x, y + dy, w, h, radius); ctx.stroke();
    let tx = x + w / 2;
    if (icon) { icon(ctx, x + (label ? h * 0.55 : w / 2), y + dy + h / 2, h * 0.36); if (label) tx += h * 0.25; }
    if (label) text(ctx, label, tx, y + dy + h / 2 - (sub ? size * 0.35 : 0) + 1, { size, color: disabled ? '#e6e2ea' : fg, maxW: w - 16 - (icon ? h * 0.6 : 0) });
    if (sub) text(ctx, sub, tx, y + dy + h / 2 + size * 0.55, { size: size * 0.62, color: disabled ? '#e6e2ea' : shade(fg.startsWith('#') ? fg : '#3a1f12', 0.15), maxW: w - 12 });
    ctx.restore();
  },
  // 클릭 영역만 (투명 버튼)
  zone(id, x, y, w, h, onClick, sfx = 'button') { cur.push({ id, x, y, w, h, onClick, sfx, layer: this.layer }); if (this.layer > curTop) curTop = this.layer; },

  panel(x, y, w, h, { fill = '#fff7e6', stroke = '#3a1f12', r = 18, shadowA = 0.3 } = {}) {
    const ctx = this.ctx;
    ctx.fillStyle = `rgba(0,0,0,${shadowA})`; rr(ctx, x + 3, y + 6, w, h, r); ctx.fill();
    ctx.fillStyle = fill; rr(ctx, x, y, w, h, r); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = stroke; rr(ctx, x, y, w, h, r); ctx.stroke();
  },
  // 모달 시작: 배경 어둡게 + 레이어 올림 (바깥 터치 차단용 zone 포함)
  modal(dim = 0.55, onOutside) {
    this.layer++;
    const ctx = this.ctx;
    ctx.fillStyle = `rgba(10,6,20,${dim})`; ctx.fillRect(0, 0, view.W, view.H);
    this.zone('__modalbg' + this.layer, 0, 0, view.W, view.H, onOutside, onOutside ? 'tap' : null);
  },
  // 코인/뽑기권 표시 바
  wallet(S, x, y) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(20,12,30,.55)'; rr(ctx, x, y, 132, 34, 17); ctx.fill();
    coin(ctx, x + 18, y + 17, 11);
    text(ctx, S.coins.toLocaleString(), x + 76, y + 18, { size: 20, color: '#ffe066', maxW: 92 });
    if (S.tickets > 0) {
      ctx.fillStyle = 'rgba(20,12,30,.55)'; rr(ctx, x - 64, y, 58, 34, 17); ctx.fill();
      ticket(ctx, x - 44, y + 17, 24);
      text(ctx, '×' + S.tickets, x - 20, y + 18, { size: 18, color: '#fff' });
    }
  },
  toast(msg, color = '#fff') { toastMsg = { msg, color, t: 0 }; },
  drawToast(dt) {
    if (!toastMsg) return;
    toastMsg.t += dt;
    const k = toastMsg.t, a = k < 0.2 ? k / 0.2 : k > 1.8 ? Math.max(0, (2.1 - k) / 0.3) : 1;
    if (k > 2.1) { toastMsg = null; return; }
    const ctx = this.ctx;
    ctx.globalAlpha = a;
    ctx.font = '18px sans-serif';
    const w = Math.min(view.W - 40, 40 + toastMsg.msg.length * 15);
    ctx.fillStyle = 'rgba(20,12,30,.88)'; rr(ctx, (view.W - w) / 2, 70 - (1 - a) * 10, w, 42, 21); ctx.fill();
    text(ctx, toastMsg.msg, view.W / 2, 92 - (1 - a) * 10, { size: 19, color: toastMsg.color, maxW: w - 20 });
    ctx.globalAlpha = 1;
  },
};

// 공용 상단바: 뒤로 + 제목 + 지갑
export function topBar(S, title, onBack) {
  const ctx = UI.ctx;
  ctx.fillStyle = 'rgba(20,12,30,.45)'; ctx.fillRect(0, 0, view.W, 64);
  if (onBack) UI.button('back', 10, 12, 52, 40, '◀', { color: '#ffffff', size: 22, onClick: onBack, radius: 12 });
  text(ctx, title, onBack ? 74 : 16, 34, { size: 26, align: 'left', color: '#fff', stroke: '#2b1d14', sw: 5 });
  UI.wallet(S, view.W - 144, 15);
}

export const ease = {
  out: (k) => 1 - (1 - k) * (1 - k),
  outBack: (k) => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
  inOut: (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
};
