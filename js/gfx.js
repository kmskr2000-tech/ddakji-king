// 절차적 그래픽: 딱지·아이·배경·아이콘·파티클. 외부 이미지 없음.
export const FONT = '"Jua", "Do Hyeon", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
export const font = (px) => `${px}px ${FONT}`;

export function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function shade(hex, k) {
  // k>0 밝게, k<0 어둡게 (-1~1)
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = k < 0 ? 0 : 255, p = Math.abs(k);
  r = Math.round(r + (t - r) * p); g = Math.round(g + (t - g) * p); b = Math.round(b + (t - b) * p);
  return `rgb(${r},${g},${b})`;
}

// 결정적 의사난수 (무늬용)
const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

export function text(ctx, str, x, y, { size = 20, color = '#fff', align = 'center', base = 'middle', stroke = null, sw = 4, shadow = null, maxW } = {}) {
  ctx.font = font(size);
  ctx.textAlign = align; ctx.textBaseline = base;
  if (shadow) { ctx.fillStyle = shadow; ctx.fillText(str, x, y + Math.max(2, size * 0.08), maxW); }
  if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = sw; ctx.strokeStyle = stroke; ctx.strokeText(str, x, y, maxW); }
  ctx.fillStyle = color; ctx.fillText(str, x, y, maxW);
}

function star(ctx, x, y, r, n = 5, inner = 0.45, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const rad = i % 2 ? r * inner : r, a = rot + (i * Math.PI) / n;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
}

// 앞면 삼각형(종이 A)에 깔리는 질감
function texture(ctx, pat, a, b, s, rnd) {
  ctx.fillStyle = a; ctx.fillRect(-s, -s, 2 * s, 2 * s);
  const ink = shade(b, -0.1);
  switch (pat) {
    case 'lines': ctx.strokeStyle = shade(b, 0.3); ctx.lineWidth = 1.2; for (let y = -s; y < s; y += 9) { ctx.beginPath(); ctx.moveTo(-s, y); ctx.lineTo(s, y); ctx.stroke(); } break;
    case 'news': ctx.fillStyle = 'rgba(40,40,40,.45)'; for (let y = -s + 6; y < s; y += 7) for (let x = -s + 4; x < s; x += 26) ctx.fillRect(x, y, 14 + rnd() * 8, 2.4); ctx.fillStyle = 'rgba(30,30,30,.7)'; ctx.fillRect(-s + 8, -s + 10, s * 0.9, 6); break;
    case 'dots': ctx.fillStyle = b; for (let y = -s; y < s; y += 14) for (let x = -s + ((y / 14) & 1) * 7; x < s; x += 14) { ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.fill(); } break;
    case 'stripe': ctx.fillStyle = b; for (let x = -3 * s; x < 3 * s; x += 18) { ctx.beginPath(); ctx.moveTo(x, -s); ctx.lineTo(x + 9, -s); ctx.lineTo(x + 9 + 2 * s, s); ctx.lineTo(x + 2 * s, s); ctx.fill(); } break;
    case 'check': case 'hanji': ctx.fillStyle = pat === 'hanji' ? 'rgba(181,69,47,.18)' : shade(b, 0.15); for (let y = -s; y < s; y += 16) for (let x = -s; x < s; x += 16) if (((x + y) / 16) & 1) ctx.fillRect(x, y, 16, 16); if (pat === 'hanji') { ctx.strokeStyle = 'rgba(120,90,60,.25)'; for (let i = 0; i < 30; i++) { ctx.beginPath(); const x = (rnd() * 2 - 1) * s, y = (rnd() * 2 - 1) * s; ctx.moveTo(x, y); ctx.lineTo(x + rnd() * 12, y + rnd() * 6); ctx.stroke(); } } break;
    case 'rivet': ctx.fillStyle = shade(a, -0.25); for (let y = -s + 8; y < s; y += 22) for (let x = -s + 8; x < s; x += 22) { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill(); } break;
    case 'comic': ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let y = -s; y < s; y += 6) for (let x = -s; x < s; x += 6) { ctx.beginPath(); ctx.arc(x, y, 1.3, 0, 7); ctx.fill(); } ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.strokeRect(-s * 0.8, -s * 0.85, s * 0.7, s * 0.5); ctx.strokeRect(s * 0.05, -s * 0.85, s * 0.7, s * 0.5); break;
    case 'scale': ctx.strokeStyle = shade(a, -0.3); ctx.lineWidth = 1.5; for (let y = -s; y < s + 10; y += 10) for (let x = -s + ((y / 10) & 1) * 8; x < s; x += 16) { ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI); ctx.stroke(); } break;
    case 'wave': ctx.strokeStyle = b; ctx.lineWidth = 3; for (let y = -s; y < s; y += 14) { ctx.beginPath(); for (let x = -s; x <= s; x += 4) ctx.lineTo(x, y + Math.sin(x / 7) * 3.5); ctx.stroke(); } break;
    case 'rainbow': { const c = ['#ff6b6b', '#ffb347', '#ffe66b', '#7bd67b', '#6bc5ff', '#9b7bff']; for (let i = 0; i < 12; i++) { ctx.fillStyle = c[i % 6]; ctx.fillRect(-s, -s + i * (2 * s / 12), 2 * s, 2 * s / 12 + 1); } break; }
    case 'stars': ctx.fillStyle = '#1a1446'; ctx.fillRect(-s, -s, 2 * s, 2 * s); ctx.fillStyle = b; for (let i = 0; i < 22; i++) { star(ctx, (rnd() * 2 - 1) * s, (rnd() * 2 - 1) * s, 2 + rnd() * 4); ctx.fill(); } break;
    case 'shine': { const g = ctx.createLinearGradient(-s, -s, s, s); g.addColorStop(0, '#f6f8fb'); g.addColorStop(0.45, a); g.addColorStop(0.5, '#ffffff'); g.addColorStop(0.55, a); g.addColorStop(1, b); ctx.fillStyle = g; ctx.fillRect(-s, -s, 2 * s, 2 * s); break; }
    case 'cloud': ctx.fillStyle = '#ffffff'; for (let i = 0; i < 6; i++) { const x = (rnd() * 2 - 1) * s, y = (rnd() * 2 - 1) * s; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + k * 9, y + (k === 1 ? -5 : 0), 8, 0, 7); ctx.fill(); } } break;
    case 'milk': ctx.fillStyle = b; ctx.fillRect(-s, s * 0.2, 2 * s, s * 0.35); ctx.fillStyle = '#fff'; ctx.font = font(s * 0.3); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('우유', 0, s * 0.38); break;
    case 'calendar': ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1; for (let i = -s; i < s; i += s / 3.5) { ctx.beginPath(); ctx.moveTo(i, -s); ctx.lineTo(i, s); ctx.moveTo(-s, i); ctx.lineTo(s, i); ctx.stroke(); } ctx.fillStyle = b; ctx.font = font(s * 0.22); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; for (let i = 0; i < 9; i++) ctx.fillText(String(1 + ((i * 7) % 31)), -s * 0.7 + (i % 3) * s * 0.7, -s * 0.6 + Math.floor(i / 3) * s * 0.6); break;
    case 'tiger': ctx.fillStyle = b; for (let i = 0; i < 9; i++) { const y = -s + i * (s / 4.2); ctx.beginPath(); ctx.moveTo(-s, y); ctx.quadraticCurveTo(-s * 0.3, y + 6, -s * 0.1, y + 1); ctx.lineTo(-s, y + 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(s, y + 4); ctx.quadraticCurveTo(s * 0.3, y + 10, s * 0.1, y + 5); ctx.lineTo(s, y + 11); ctx.fill(); } break;
    default: // plain: 종이결
      ctx.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 14; i++) ctx.fillRect((rnd() * 2 - 1) * s, (rnd() * 2 - 1) * s, rnd() * 20, 1.5);
  }
}

// 앞면 중앙 스티커(엠블럼)
function emblem(ctx, pat, a, b, s) {
  const r = s * 0.32;
  const disc = (fill, ring) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = ring; ctx.stroke(); };
  switch (pat) {
    case 'star': disc(b, shade(b, -0.4)); ctx.fillStyle = '#ffe24a'; star(ctx, 0, 2, r * 0.8); ctx.fill(); break;
    case 'won': disc('#e6c35c', '#8a6d1f'); ctx.fillStyle = '#5a4510'; ctx.font = font(r * 1.2); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('₩', 0, 2); break;
    case 'taegeuk': ctx.save(); ctx.rotate(-0.5); ctx.fillStyle = '#d6283b'; ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#1f4fa8'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI); ctx.fill(); ctx.fillStyle = '#d6283b'; ctx.beginPath(); ctx.arc(-r / 2, 0, r / 2, 0, 7); ctx.fill(); ctx.fillStyle = '#1f4fa8'; ctx.beginPath(); ctx.arc(r / 2, 0, r / 2, 0, 7); ctx.fill(); ctx.restore(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); break;
    case 'pinwheel': for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * Math.PI / 2); ctx.fillStyle = i & 1 ? a : '#ff6b9a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r, -r * 0.2); ctx.lineTo(r * 0.2, -r); ctx.closePath(); ctx.fill(); ctx.restore(); } break;
    case 'swirl': case 'dragon': { disc(pat === 'dragon' ? '#0f5c4e' : '#2a1660', b); ctx.strokeStyle = b; ctx.lineWidth = 3; ctx.beginPath(); for (let t = 0; t < 14; t += 0.2) ctx.lineTo(Math.cos(t) * t * r / 15, Math.sin(t) * t * r / 15); ctx.stroke(); if (pat === 'dragon') { ctx.fillStyle = '#ffe66b'; ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, 7); ctx.fill(); } break; }
    case 'phoenix': disc('#7a0f14', b); ctx.fillStyle = b; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(i * r * 0.3, -r * 0.1, r * 0.13, r * 0.55, i * 0.35, 0, 7); ctx.fill(); } break;
    case 'eye': ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.1, r * 0.65, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-r * 0.15, -r * 0.15, r * 0.13, 0, 7); ctx.fill(); break;
    case 'mount': disc('#cfe9ff', '#3e8f4f'); ctx.fillStyle = '#3e8f4f'; ctx.beginPath(); ctx.moveTo(-r, r * 0.5); ctx.lineTo(-r * 0.3, -r * 0.5); ctx.lineTo(0, -r * 0.1); ctx.lineTo(r * 0.4, -r * 0.7); ctx.lineTo(r, r * 0.5); ctx.fill(); break;
    case 'apple': ctx.fillStyle = '#d6283b'; ctx.beginPath(); ctx.arc(-r * 0.3, r * 0.1, r * 0.6, 0, 7); ctx.arc(r * 0.3, r * 0.1, r * 0.6, 0, 7); ctx.fill(); ctx.fillStyle = '#79c14b'; ctx.beginPath(); ctx.ellipse(r * 0.25, -r * 0.6, r * 0.3, r * 0.14, -0.5, 0, 7); ctx.fill(); break;
    case 'crown': disc('#7a5200', '#ffe9a0'); crown(ctx, 0, 2, r * 1.4, '#ffe066'); break;
    default: return false;
  }
  return true;
}
const EMBLEMS = new Set(['star', 'won', 'taegeuk', 'pinwheel', 'swirl', 'dragon', 'phoenix', 'eye', 'mount', 'apple', 'crown']);

export function crown(ctx, x, y, w, color = '#ffd447') {
  const h = w * 0.62;
  ctx.fillStyle = color; ctx.strokeStyle = shade(color.startsWith('#') ? color : '#ffd447', -0.5); ctx.lineWidth = Math.max(1.5, w * 0.06);
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y + h / 2); ctx.lineTo(x - w / 2, y - h / 4); ctx.lineTo(x - w / 4, y + h / 10); ctx.lineTo(x, y - h / 2);
  ctx.lineTo(x + w / 4, y + h / 10); ctx.lineTo(x + w / 2, y - h / 4); ctx.lineTo(x + w / 2, y + h / 2); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(x, y + h / 6, w * 0.07, 0, 7); ctx.fill();
}

// 딱지 그리기. s = 반변 길이. flip = 세로 스케일(-1~1, 음수면 뒷면). tilt = 기울어짐 스택(0~2).
export function drawDdakji(ctx, d, x, y, s, { rot = 0, flip = 1, lift = 0, tilt = 0, shadow = true, glow = null, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (shadow) {
    ctx.fillStyle = `rgba(0,0,0,${0.28 - Math.min(0.18, lift / 300)})`;
    ctx.beginPath(); ctx.ellipse(x + 6 + lift * 0.1, y + 8 + lift * 0.35, s * 1.15 * (1 - lift / 600), s * 0.9 * (1 - lift / 600), 0, 0, 7); ctx.fill();
  }
  ctx.translate(x, y - lift);
  ctx.rotate(rot);
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 24; }
  const back = flip < 0;
  // 기울어짐: 한쪽 모서리가 들린 느낌(살짝 사다리꼴 + 그림자 띠)
  const fy = Math.max(0.04, Math.abs(flip));
  ctx.scale(1, fy * (1 - 0.05 * tilt));
  if (tilt > 0) ctx.transform(1, 0, -0.05 * tilt, 1, 0, 0);
  const rnd = mulberry(hash(d.id));
  const R = s * 0.1;
  // 바닥 두께
  ctx.fillStyle = shade(back ? d.a : d.b, -0.45);
  rr(ctx, -s, -s + 4, 2 * s, 2 * s, R); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.save();
  rr(ctx, -s, -s, 2 * s, 2 * s, R); ctx.clip();
  if (!back) {
    const emb = EMBLEMS.has(d.pat);
    // 상하 삼각형: 종이 A + 질감
    for (const sy of [-1, 1]) {
      ctx.save(); ctx.beginPath(); ctx.moveTo(-s, sy * s); ctx.lineTo(s, sy * s); ctx.lineTo(0, 0); ctx.closePath(); ctx.clip();
      texture(ctx, emb ? 'plain' : d.pat, d.a, d.b, s, rnd);
      ctx.restore();
    }
    // 좌우 삼각형: 종이 B
    for (const sx of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(sx * s, -s); ctx.lineTo(sx * s, s); ctx.lineTo(0, 0); ctx.closePath();
      ctx.fillStyle = sx < 0 ? d.b : shade(d.b, -0.12); ctx.fill();
    }
    // 접힌 선
    ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-s, -s); ctx.lineTo(s, s); ctx.moveTo(s, -s); ctx.lineTo(-s, s); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-s, -s + 2); ctx.lineTo(0, 2); ctx.lineTo(s, -s + 2); ctx.stroke();
    if (emb) emblem(ctx, d.pat, d.a, d.b, s);
  } else {
    // 뒷면: 종이 B 바탕 + 바람개비 접힘
    ctx.fillStyle = d.b; ctx.fillRect(-s, -s, 2 * s, 2 * s);
    const k = s * 0.42;
    ctx.fillStyle = d.a;
    ctx.beginPath(); ctx.moveTo(-k, -k); ctx.lineTo(k, -k); ctx.lineTo(k, k); ctx.lineTo(-k, k); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-k, -k); ctx.lineTo(-s, -s * 0.2); ctx.moveTo(k, -k); ctx.lineTo(s * 0.2, -s);
    ctx.moveTo(k, k); ctx.lineTo(s, s * 0.2); ctx.moveTo(-k, k); ctx.lineTo(-s * 0.2, s);
    ctx.stroke();
    ctx.strokeRect(-k, -k, 2 * k, 2 * k);
  }
  // 위쪽 하이라이트
  const g = ctx.createLinearGradient(0, -s, 0, s);
  g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.12)');
  ctx.fillStyle = g; ctx.fillRect(-s, -s, 2 * s, 2 * s);
  if (tilt > 0) { ctx.fillStyle = `rgba(0,0,0,${0.1 * tilt})`; ctx.fillRect(-s, s - s * 0.3 * tilt, 2 * s, s * 0.3 * tilt); }
  ctx.restore();
  ctx.strokeStyle = '#3a1f12'; ctx.lineWidth = Math.max(2, s * 0.045);
  rr(ctx, -s, -s, 2 * s, 2 * s, R); ctx.stroke();
  ctx.restore();
}

// 아이 초상화 (흉상). mood: normal|happy|sad|angry|shock
export function drawKid(ctx, look, x, y, r, mood = 'normal', t = 0) {
  const { skin, hair, hs, shirt, acc, age } = look;
  const old = age === 'old', adult = age === 'adult';
  const hairC = old ? '#e6e6e6' : hair;
  ctx.save(); ctx.translate(x, y);
  ctx.lineJoin = 'round';
  const outline = 'rgba(40,20,10,.85)'; const lw = Math.max(1.5, r * 0.06);
  // 몸
  ctx.fillStyle = shirt; ctx.strokeStyle = outline; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(-r * 1.05, r * 1.75); ctx.quadraticCurveTo(-r * 1.0, r * 0.75, 0, r * 0.75); ctx.quadraticCurveTo(r * 1.0, r * 0.75, r * 1.05, r * 1.75); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = shade(shirt, -0.15); ctx.beginPath(); ctx.moveTo(-r * 0.25, r * 0.78); ctx.lineTo(0, r * 1.05); ctx.lineTo(r * 0.25, r * 0.78); ctx.fill();
  // 뒷머리
  ctx.fillStyle = hairC;
  if (hs === 3) { ctx.beginPath(); ctx.ellipse(0, r * 0.25, r * 1.08, r * 1.15, 0, 0, 7); ctx.fill(); ctx.stroke(); }
  if (hs === 5) { for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * r * 1.0, -r * 0.2, r * 0.38, 0, 7); ctx.fill(); ctx.stroke(); } }
  // 얼굴
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.ellipse(0, 0, r * (adult || old ? 0.92 : 0.95), r * (adult || old ? 1.0 : 0.92), 0, 0, 7); ctx.fill(); ctx.stroke();
  // 귀
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * r * 0.93, r * 0.08, r * 0.17, 0, 7); ctx.fill(); ctx.stroke(); }
  // 앞머리
  ctx.fillStyle = hairC; ctx.beginPath();
  switch (hs) {
    case 0: ctx.arc(0, -r * 0.1, r * 0.95, Math.PI * 1.05, Math.PI * 1.95); ctx.quadraticCurveTo(0, -r * 0.55, -r * 0.92, -r * 0.35); break;
    case 1: ctx.arc(0, -r * 0.05, r * 0.98, Math.PI * 1.0, Math.PI * 2.0); ctx.lineTo(r * 0.9, -r * 0.2); ctx.quadraticCurveTo(r * 0.1, -r * 0.6, -r * 0.4, -r * 0.25); ctx.quadraticCurveTo(-r * 0.7, -r * 0.4, -r * 0.98, -r * 0.05); break;
    case 2: ctx.moveTo(-r * 0.95, -r * 0.1); for (let i = 0; i <= 6; i++) { const a = Math.PI * (1.05 + i * 0.15); const rr2 = i % 2 ? r * 0.9 : r * 1.3; ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2 - r * 0.05); } ctx.lineTo(r * 0.95, -r * 0.1); ctx.quadraticCurveTo(0, -r * 0.5, -r * 0.95, -r * 0.1); break;
    case 3: case 5: ctx.arc(0, -r * 0.05, r * 1.0, Math.PI * 1.0, Math.PI * 2.0); ctx.lineTo(r * 0.95, 0); ctx.quadraticCurveTo(r * 0.5, -r * 0.45, 0, -r * 0.35); ctx.quadraticCurveTo(-r * 0.5, -r * 0.45, -r * 0.95, 0); break;
    default: ctx.arc(0, -r * 0.05, r * 1.03, Math.PI * 0.95, Math.PI * 2.05); ctx.lineTo(r * 0.98, -r * 0.05); ctx.lineTo(-r * 0.98, -r * 0.05); break;
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // 볼
  ctx.fillStyle = 'rgba(255,110,110,.35)';
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * r * 0.5, r * 0.35, r * 0.17, r * 0.1, 0, 0, 7); ctx.fill(); }
  // 눈
  ctx.strokeStyle = '#2a1a10'; ctx.fillStyle = '#2a1a10'; ctx.lineWidth = r * 0.09; ctx.lineCap = 'round';
  const blink = (Math.sin(t * 1.3 + x) > 0.985);
  for (const sx of [-1, 1]) {
    const ex = sx * r * 0.35, ey = r * 0.08;
    if (mood === 'happy') { ctx.beginPath(); ctx.arc(ex, ey + r * 0.05, r * 0.13, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    else if (blink || mood === 'sad') { ctx.beginPath(); ctx.moveTo(ex - r * 0.12, ey); ctx.lineTo(ex + r * 0.12, ey + (mood === 'sad' ? r * 0.04 : 0)); ctx.stroke(); }
    else if (mood === 'shock') { ctx.beginPath(); ctx.arc(ex, ey, r * 0.13, 0, 7); ctx.lineWidth = r * 0.06; ctx.stroke(); ctx.beginPath(); ctx.arc(ex, ey, r * 0.04, 0, 7); ctx.fill(); ctx.lineWidth = r * 0.09; }
    else { ctx.beginPath(); ctx.arc(ex, ey, r * 0.09, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - r * 0.03, ey - r * 0.03, r * 0.03, 0, 7); ctx.fill(); ctx.fillStyle = '#2a1a10'; }
    if (mood === 'angry') { ctx.beginPath(); ctx.moveTo(ex - sx * r * 0.18, ey - r * 0.25); ctx.lineTo(ex + sx * r * 0.12, ey - r * 0.14); ctx.stroke(); }
  }
  if (mood === 'sad') { ctx.fillStyle = '#6bc5ff'; ctx.beginPath(); ctx.ellipse(r * 0.38, r * 0.3 + ((t * 40) % (r * 0.4)), r * 0.06, r * 0.1, 0, 0, 7); ctx.fill(); }
  // 입
  ctx.lineWidth = r * 0.08; ctx.strokeStyle = '#7a2a1a';
  ctx.beginPath();
  if (mood === 'happy') { ctx.fillStyle = '#c0392b'; ctx.arc(0, r * 0.42, r * 0.2, 0, Math.PI); ctx.closePath(); ctx.fill(); }
  else if (mood === 'sad' || mood === 'angry') { ctx.arc(0, r * 0.62, r * 0.17, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
  else if (mood === 'shock') { ctx.fillStyle = '#7a2a1a'; ctx.ellipse(0, r * 0.5, r * 0.1, r * 0.14, 0, 0, 7); ctx.fill(); }
  else { ctx.arc(0, r * 0.38, r * 0.16, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
  // 주름
  if (old) { ctx.strokeStyle = 'rgba(120,70,40,.5)'; ctx.lineWidth = r * 0.04; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * r * 0.62, r * 0.08, r * 0.1, -0.8, 0.8); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.3); ctx.lineTo(r * 0.25, -r * 0.3); ctx.stroke(); }
  // 장신구
  ctx.lineWidth = lw; ctx.strokeStyle = outline;
  switch (acc) {
    case 'snot': ctx.fillStyle = '#9fe0ff'; ctx.beginPath(); ctx.ellipse(-r * 0.08, r * 0.3 + Math.sin(t * 2) * r * 0.03, r * 0.06, r * 0.1, 0, 0, 7); ctx.fill(); break;
    case 'bow': ctx.fillStyle = '#ff4d8a'; ctx.save(); ctx.translate(r * 0.55, -r * 0.75); for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(sx * r * 0.35, -r * 0.2); ctx.lineTo(sx * r * 0.35, r * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke(); } ctx.beginPath(); ctx.arc(0, 0, r * 0.09, 0, 7); ctx.fill(); ctx.restore(); break;
    case 'band': ctx.fillStyle = '#f7d9a8'; ctx.save(); ctx.translate(-r * 0.5, r * 0.28); ctx.rotate(-0.5); rr(ctx, -r * 0.22, -r * 0.08, r * 0.44, r * 0.16, r * 0.05); ctx.fill(); ctx.stroke(); ctx.restore(); break;
    case 'cap': ctx.fillStyle = shirt === '#ffffff' ? '#e8473b' : shade(shirt, -0.1); ctx.beginPath(); ctx.arc(0, -r * 0.3, r * 0.92, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(r * 0.45, -r * 0.32, r * 0.65, r * 0.14, 0.1, 0, 7); ctx.fill(); ctx.stroke(); break;
    case 'headband': ctx.fillStyle = '#e8473b'; ctx.fillRect(-r * 0.95, -r * 0.48, r * 1.9, r * 0.2); ctx.strokeRect(-r * 0.95, -r * 0.48, r * 1.9, r * 0.2); break;
    case 'glasses': ctx.strokeStyle = '#1d1d1d'; ctx.lineWidth = r * 0.07; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * r * 0.35, r * 0.08, r * 0.2, 0, 7); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(-r * 0.15, r * 0.08); ctx.lineTo(r * 0.15, r * 0.08); ctx.stroke(); break;
    case 'mustache': ctx.fillStyle = '#3a2516'; ctx.beginPath(); ctx.ellipse(-r * 0.15, r * 0.28, r * 0.17, r * 0.07, 0.2, 0, 7); ctx.ellipse(r * 0.15, r * 0.28, r * 0.17, r * 0.07, -0.2, 0, 7); ctx.fill(); break;
    case 'crownlet': crown(ctx, 0, -r * 1.0, r * 0.7); break;
    case 'crown': crown(ctx, 0, -r * 1.12, r * 1.2); break;
  }
  ctx.restore();
}

export function coin(ctx, x, y, r) {
  ctx.fillStyle = '#b8860b'; ctx.beginPath(); ctx.arc(x, y + r * 0.15, r, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffcc33'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.strokeStyle = '#e0a800'; ctx.lineWidth = Math.max(1, r * 0.18); ctx.beginPath(); ctx.arc(x, y, r * 0.65, 0, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.2, 0, 7); ctx.fill();
}

export function ticket(ctx, x, y, w) {
  const h = w * 0.6;
  ctx.fillStyle = '#ff6fb1'; rr(ctx, x - w / 2, y - h / 2, w, h, h * 0.2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + w * 0.2, y - h / 2 + 2); ctx.lineTo(x + w * 0.2, y + h / 2 - 2); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#fff'; star(ctx, x - w * 0.12, y, h * 0.3); ctx.fill();
}

export function itemIcon(ctx, id, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.lineWidth = 2; ctx.strokeStyle = '#2b1d14';
  switch (id) {
    case 'lead': ctx.fillStyle = '#7d8796'; ctx.beginPath(); ctx.moveTo(-s * 0.7, s * 0.5); ctx.lineTo(-s * 0.45, -s * 0.4); ctx.lineTo(s * 0.45, -s * 0.4); ctx.lineTo(s * 0.7, s * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = font(s * 0.55); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('납', 0, s * 0.1); break;
    case 'tape': ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(0, 0, s * 0.7, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#c9a86b'; ctx.beginPath(); ctx.arc(0, 0, s * 0.32, 0, 7); ctx.fill(); ctx.stroke(); break;
    case 'fan': for (let i = -3; i <= 3; i++) { ctx.save(); ctx.rotate(i * 0.25); ctx.fillStyle = i & 1 ? '#ff8fa3' : '#ffd1dc'; ctx.beginPath(); ctx.moveTo(0, s * 0.6); ctx.lineTo(-s * 0.16, -s * 0.7); ctx.lineTo(s * 0.16, -s * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); } break;
    case 'coin500': coin(ctx, 0, 0, s * 0.7); ctx.fillStyle = '#7a5200'; ctx.font = font(s * 0.45); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('500', 0, 1); break;
    case 'ironHand': ctx.fillStyle = '#5a6b7c'; rr(ctx, -s * 0.5, -s * 0.3, s, s * 0.9, s * 0.2); ctx.fill(); ctx.stroke(); for (let i = 0; i < 4; i++) { rr(ctx, -s * 0.5 + i * s * 0.25, -s * 0.75, s * 0.22, s * 0.55, s * 0.1); ctx.fill(); ctx.stroke(); } break;
  }
  ctx.restore();
}

// 배경: 지역 테마별, 오프스크린 캐시
const bgCache = new Map();
export function background(ctx, region, W, H, scale) {
  const key = `${region.id}:${W}:${H}:${scale}`;
  let c = bgCache.get(key);
  if (!c) {
    if (bgCache.size > 8) bgCache.clear();
    c = document.createElement('canvas');
    c.width = Math.round(W * scale); c.height = Math.round(H * scale);
    const g = c.getContext('2d'); g.scale(scale, scale);
    paintBg(g, region, W, H);
    bgCache.set(key, c);
  }
  ctx.drawImage(c, 0, 0, W, H);
}

function paintBg(g, R, W, H) {
  const hz = H * 0.24;
  const sky = g.createLinearGradient(0, 0, 0, hz);
  sky.addColorStop(0, R.sky[0]); sky.addColorStop(1, R.sky[1]);
  g.fillStyle = sky; g.fillRect(0, 0, W, hz + 2);
  const rnd = mulberry(R.id * 99);
  const th = R.theme;
  if (th === 'alley' || th === 'market') {
    g.fillStyle = th === 'alley' ? '#b5654a' : '#8a5a3c'; g.fillRect(0, hz * 0.35, W, hz * 0.65);
    g.strokeStyle = 'rgba(60,20,10,.35)'; g.lineWidth = 1;
    for (let y = hz * 0.35; y < hz; y += 10) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = ((y / 10) & 1) * 12; x < W; x += 24) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 10); g.stroke(); } }
    if (th === 'market') { for (let i = 0; i < 6; i++) { g.fillStyle = i & 1 ? '#e2382a' : '#ffd447'; g.beginPath(); g.moveTo(i * 70, hz * 0.3); g.lineTo(i * 70 + 70, hz * 0.3); g.lineTo(i * 70 + 60, hz * 0.55); g.lineTo(i * 70 + 10, hz * 0.55); g.fill(); } for (let i = 0; i < 5; i++) { g.fillStyle = '#ff5a3c'; g.beginPath(); g.ellipse(40 + i * 85, hz * 0.18, 9, 12, 0, 0, 7); g.fill(); g.strokeStyle = '#5a2a1a'; g.beginPath(); g.moveTo(40 + i * 85, 0); g.lineTo(40 + i * 85, hz * 0.1); g.stroke(); } }
    else { g.fillStyle = '#3b6fa8'; for (let i = 0; i < 3; i++) { g.fillRect(40 + i * 140, hz * 0.45, 46, 30); g.fillStyle = '#9fd0ff'; g.fillRect(43 + i * 140, hz * 0.45 + 3, 40, 24); g.fillStyle = '#3b6fa8'; } g.strokeStyle = '#333'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, hz * 0.2); g.quadraticCurveTo(W / 2, hz * 0.35, W, hz * 0.15); g.stroke(); }
  } else if (th === 'school') {
    g.fillStyle = '#efe3c9'; g.fillRect(30, hz * 0.2, W - 60, hz * 0.8);
    g.fillStyle = '#9fd0ff'; for (let r = 0; r < 2; r++) for (let i = 0; i < 7; i++) g.fillRect(45 + i * 50, hz * 0.32 + r * 26, 30, 18);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(W / 2, hz * 0.18, 14, 0, 7); g.fill(); g.strokeStyle = '#333'; g.lineWidth = 2; g.stroke(); g.beginPath(); g.moveTo(W / 2, hz * 0.18); g.lineTo(W / 2, hz * 0.1); g.moveTo(W / 2, hz * 0.18); g.lineTo(W / 2 + 7, hz * 0.18); g.stroke();
  } else if (th === 'shop') {
    g.fillStyle = '#f5e6c8'; g.fillRect(0, hz * 0.25, W, hz * 0.75);
    for (let i = 0; i < 12; i++) { g.fillStyle = i & 1 ? '#ff6fb1' : '#fff'; g.beginPath(); g.moveTo(i * 36, hz * 0.45); g.lineTo(i * 36 + 36, hz * 0.45); g.lineTo(i * 36 + 36, hz * 0.62); g.arc(i * 36 + 18, hz * 0.62, 18, 0, Math.PI); g.fill(); }
    g.fillStyle = '#2c6bd6'; rr(g, W / 2 - 70, hz * 0.08, 140, 32, 6); g.fill(); g.fillStyle = '#fff'; g.font = font(22); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('행복 문방구', W / 2, hz * 0.08 + 17);
  } else if (th === 'roof') {
    g.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { const x = rnd() * W, y = hz * (0.15 + rnd() * 0.4); for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + k * 16, y + (k % 2) * -6, 14, 0, 7); g.fill(); } }
    g.fillStyle = '#5a7fa0'; g.fillRect(W - 110, hz * 0.3, 70, hz * 0.7); g.fillStyle = '#7fa0c0'; g.fillRect(W - 116, hz * 0.26, 82, 10);
    g.strokeStyle = '#3d4450'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, hz * 0.7); g.lineTo(W, hz * 0.7); g.stroke(); for (let x = 10; x < W; x += 26) { g.beginPath(); g.moveTo(x, hz * 0.7); g.lineTo(x, hz); g.stroke(); }
  } else if (th === 'arena') {
    for (let i = 0; i < 5; i++) { const x = 30 + i * 90; const lg = g.createLinearGradient(x, 0, x, hz); lg.addColorStop(0, 'rgba(255,240,180,.55)'); lg.addColorStop(1, 'rgba(255,240,180,0)'); g.fillStyle = lg; g.beginPath(); g.moveTo(x - 6, 0); g.lineTo(x + 6, 0); g.lineTo(x + 40, hz); g.lineTo(x - 40, hz); g.fill(); }
    g.fillStyle = '#c73a2b'; rr(g, W / 2 - 150, hz * 0.3, 300, 38, 6); g.fill(); g.fillStyle = '#ffe066'; g.font = font(20); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('제1회 전국 딱지 대회', W / 2, hz * 0.3 + 20);
    for (let i = 0; i < 40; i++) { g.fillStyle = `hsl(${rnd() * 360},60%,${40 + rnd() * 20}%)`; g.beginPath(); g.arc(rnd() * W, hz * 0.75 + rnd() * hz * 0.25, 6, 0, 7); g.fill(); }
  }
  // 바닥
  const gr = g.createLinearGradient(0, hz, 0, H);
  gr.addColorStop(0, shade(R.ground, -0.15)); gr.addColorStop(0.3, R.ground); gr.addColorStop(1, shade(R.ground, -0.25));
  g.fillStyle = gr; g.fillRect(0, hz, W, H - hz);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, hz, W, 4);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.08)';
    g.fillRect(rnd() * W, hz + rnd() * (H - hz), 1 + rnd() * 2.5, 1 + rnd() * 2.5);
  }
  if (R.theme === 'school') { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 4; g.beginPath(); g.ellipse(W / 2, H * 0.55, W * 0.6, H * 0.2, 0, 0, 7); g.stroke(); }
  if (R.theme === 'arena') { g.strokeStyle = 'rgba(255,204,51,.35)'; g.lineWidth = 5; g.beginPath(); g.arc(W / 2, H * 0.47, 150, 0, 7); g.stroke(); }
  // 분필 원 (경기장)
  g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 3; g.setLineDash([10, 8]);
  g.beginPath(); g.arc(W / 2, H * 0.47, 135, 0, 7); g.stroke(); g.setLineDash([]);
  const vg = g.createRadialGradient(W / 2, H * 0.5, H * 0.25, W / 2, H * 0.5, H * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

// 파티클 + 떠오르는 글자
export class FX {
  constructor() { this.p = []; this.f = []; this.shake = 0; this.flash = 0; this.flashColor = '#fff'; }
  burst(x, y, { n = 12, colors = ['#fff'], speed = 220, life = 0.7, size = 4, grav = 600, shape = 'sq', spread = Math.PI * 2, dir = -Math.PI / 2 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = dir + (Math.random() - 0.5) * spread, v = speed * (0.4 + Math.random() * 0.8);
      this.p.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, t: 0, size: size * (0.6 + Math.random() * 0.8), color: colors[(Math.random() * colors.length) | 0], grav, shape, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12 });
    }
    if (this.p.length > 600) this.p.splice(0, this.p.length - 600);
  }
  confetti(W, n = 80) { const c = ['#ff6b6b', '#ffd447', '#4aa3ff', '#7bd67b', '#ff6fb1', '#c06bff']; for (let i = 0; i < n; i++) this.p.push({ x: Math.random() * W, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 80, vy: 80 + Math.random() * 120, life: 3.5, t: 0, size: 5 + Math.random() * 4, color: c[i % 6], grav: 40, shape: 'paper', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10 }); }
  float(str, x, y, { color = '#fff', size = 26, life = 1.1, vy = -60 } = {}) { this.f.push({ str, x, y, color, size, life, t: 0, vy }); }
  kick(s) { this.shake = Math.max(this.shake, s); }
  blink(c = '#fff', a = 0.6) { this.flash = a; this.flashColor = c; }
  update(dt) {
    for (const q of this.p) { q.t += dt; q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt; if (q.shape === 'paper') q.vx += Math.sin(q.t * 4 + q.rot) * 40 * dt; }
    this.p = this.p.filter((q) => q.t < q.life);
    for (const q of this.f) { q.t += dt; q.y += q.vy * dt; q.vy *= 0.96; }
    this.f = this.f.filter((q) => q.t < q.life);
    this.shake = Math.max(0, this.shake - dt * 40);
    this.flash = Math.max(0, this.flash - dt * 2.5);
  }
  offset() { const s = this.shake; return s > 0 ? [(Math.random() - 0.5) * s, (Math.random() - 0.5) * s] : [0, 0]; }
  draw(ctx) {
    for (const q of this.p) {
      const a = 1 - q.t / q.life; ctx.globalAlpha = Math.min(1, a * 1.5); ctx.fillStyle = q.color;
      if (q.shape === 'circle') { ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, 7); ctx.fill(); }
      else if (q.shape === 'star') { star(ctx, q.x, q.y, q.size, 5, 0.45, q.rot); ctx.fill(); }
      else { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.scale(1, q.shape === 'paper' ? Math.cos(q.t * 8 + q.rot) : 1); ctx.fillRect(-q.size / 2, -q.size / 2, q.size, q.size * (q.shape === 'paper' ? 0.6 : 1)); ctx.restore(); }
    }
    ctx.globalAlpha = 1;
    for (const q of this.f) {
      const k = q.t / q.life, sc = k < 0.15 ? 0.6 + k / 0.15 * 0.6 : 1.2 - Math.min(0.2, (k - 0.15));
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      text(ctx, q.str, q.x, q.y, { size: q.size * sc, color: q.color, stroke: '#2b1d14', sw: 5 });
    }
    ctx.globalAlpha = 1;
  }
  drawFlash(ctx, W, H) { if (this.flash > 0) { ctx.globalAlpha = this.flash; ctx.fillStyle = this.flashColor; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; } }
}
export { star };
