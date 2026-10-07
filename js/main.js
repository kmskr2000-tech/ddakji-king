// 코어 프로토타입 렌더: 허수아비 딱지 1개를 계속 타격. (상태머신·화면은 작업 #2)
import { CFG, Level, Aim, Charge, rollAimParams, effectiveStats, judge, radii, requiredPower } from './aim.js?v=1791365602';

// 자가업데이트: version.json(no-store) vs window.__V. 다르면 ?v=새버전으로 교체 (같으면 무동작 = 루프 없음)
if (window.__V) {
  fetch('assets/version.json', { cache: 'no-store' }).then((r) => r.json()).then(({ v }) => {
    if (String(v) !== String(window.__V)) location.replace(location.pathname + '?v=' + v);
  }).catch(() => {});
}

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const { W, H, center, ddakjiR } = CFG;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const s = Math.min(innerWidth / W, innerHeight / H);
  cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px';
  cv.width = Math.round(W * s * dpr); cv.height = Math.round(H * s * dpr);
  ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
addEventListener('resize', resize); resize();

// 프로토타입 고정 빌드 (URL ?str=4&focus=3&luck=3&item=ironHand 로 변경)
const q = new URLSearchParams(location.search);
const base = { str: +(q.get('str') ?? 3), focus: +(q.get('focus') ?? 4), luck: +(q.get('luck') ?? 3) };
const item = q.get('item') || '';
const stats = effectiveStats(base, item);
const attacker = { stats, hasTape: item === 'tape', tapeUsed: false };
const target = { x: center.x, y: center.y, tiltStacks: 0 };

let aim = new Aim(rollAimParams(stats));
let charge = new Charge(item === 'ironHand');
let phase = 'AIM';           // AIM | CHARGE | STRIKE | JUDGE
let strike = null;           // {x,y,power,t}
let result = null;           // {level,crit,...,t}
let flipT = 0;
const tally = { FLIP: 0, INNER: 0, MISS: 0, WHIFF: 0, crit: 0 };
const log = (typeof window !== 'undefined') ? (window.__ddakji = { tally, last: null }) : null;

function press() { if (phase === 'AIM') { phase = 'CHARGE'; charge.press(); } }
function release() {
  if (phase !== 'CHARGE') return;
  const power = charge.release();
  strike = { x: aim.x, y: aim.y, power, t: 0 };  // 에임 위치 고정
  phase = 'STRIKE';
}
cv.addEventListener('pointerdown', (e) => { e.preventDefault(); press(); });
addEventListener('pointerup', release);
addEventListener('pointercancel', release);
addEventListener('keydown', (e) => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); press(); } });
addEventListener('keyup', (e) => { if (e.code === 'Space') release(); });

function nextTurn() {
  phase = 'AIM'; result = null;
  aim.charging = false;
}

function update(dt) {
  if (phase === 'AIM' || phase === 'CHARGE') {
    aim.step(dt, phase === 'CHARGE');
    charge.update(dt);
  } else if (phase === 'STRIKE') {
    strike.t += dt;
    if (strike.t >= 0.4) {
      const r = judge(strike.x, strike.y, strike.power, attacker, target);
      result = { ...r, t: 0, power: strike.power };
      tally[r.level]++; if (r.crit) tally.crit++;
      if (log) log.last = { ...r, power: strike.power, tilt: target.tiltStacks };
      phase = 'JUDGE';
    }
  } else if (phase === 'JUDGE') {
    result.t += dt;
    if (result.level === Level.FLIP) flipT = result.t;
    if (result.t >= (result.level === Level.FLIP ? 1.5 : 0.8)) {
      flipT = 0;
      if (result.level === Level.FLIP) { aim = new Aim(rollAimParams(stats)); }
      nextTurn();
    }
  }
}

const COLORS = { FLIP: '#ffd447', INNER: '#ff8c42', MISS: '#9aa0b4', WHIFF: '#9aa0b4' };
const LABEL = { FLIP: '뒤집혔다!', INNER: '이너링! 기울어짐', MISS: '빗나감…', WHIFF: '헛스윙!' };

function ring(r, color, w = 2, dash = []) {
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.setLineDash(dash); ctx.lineWidth = w; ctx.strokeStyle = color; ctx.stroke(); ctx.setLineDash([]);
}

function draw() {
  ctx.fillStyle = '#2b2640'; ctx.fillRect(0, 0, W, H);

  // 딱지 (기울어짐 = 회전·찌그러짐)
  ctx.save();
  ctx.translate(target.x, target.y);
  const flipping = phase === 'JUDGE' && result.level === Level.FLIP;
  const tiltRad = target.tiltStacks * 0.12;
  ctx.rotate(tiltRad);
  if (flipping) { const k = Math.min(1, flipT / 0.8); ctx.scale(1, Math.cos(k * Math.PI * 3)); }
  ctx.fillStyle = flipping && flipT > 0.4 ? '#4aa3ff' : '#d8613c';
  ctx.beginPath(); ctx.arc(0, 0, ddakjiR, 0, Math.PI * 2); ctx.fill();
  ring(ddakjiR, '#6b2a16', 4);
  // 판정 구역 가이드 (프로토타입용: 현재 파워 기준 반경 표시)
  const pw = phase === 'CHARGE' ? charge.power : 1;
  const rr = radii(stats, pw, target.tiltStacks);
  ring(rr.bull, 'rgba(255,255,255,.85)', 2, [4, 3]);
  ring(rr.inner, 'rgba(255,255,255,.45)', 2, [4, 3]);
  ctx.restore();

  // 에임 / 착탄점
  const ax = phase === 'STRIKE' || phase === 'JUDGE' ? strike.x : aim.x;
  const ay = phase === 'STRIKE' || phase === 'JUDGE' ? strike.y : aim.y;
  if (phase === 'STRIKE') { // 하단에서 날아오는 딱지
    const k = strike.t / 0.4, e = 1 - (1 - k) * (1 - k);
    const fx = center.x + (ax - center.x) * e, fy = 760 + (ay - 760) * e;
    ctx.fillStyle = '#e9d8a6'; ctx.beginPath(); ctx.arc(fx, fy, 30 - 14 * e, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = phase === 'CHARGE' ? '#ff5d5d' : '#ffffff'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(ax - 12, ay); ctx.lineTo(ax + 12, ay); ctx.moveTo(ax, ay - 12); ctx.lineTo(ax, ay + 12); ctx.stroke();
  ctx.beginPath(); ctx.arc(ax, ay, 7, 0, Math.PI * 2); ctx.stroke();

  // 결과
  ctx.textAlign = 'center';
  if (result) {
    ctx.font = 'bold 34px monospace'; ctx.fillStyle = COLORS[result.level];
    ctx.fillText((result.gated ? '파워 부족! 이너링' : LABEL[result.level]) + (result.crit ? ' ★CRIT' : ''), W / 2, 200);
    ctx.font = '14px monospace'; ctx.fillStyle = '#ccc';
    ctx.fillText(`dist ${result.dist.toFixed(1)}  bull ${result.bull.toFixed(1)}  inner ${result.inner.toFixed(1)}  power ${(result.power * 100) | 0}%`, W / 2, 224);
  }

  // 차지 게이지
  const gx = 40, gy = 690, gw = W - 80, gh = 26;
  const req = requiredPower(target.tiltStacks), flipOk = charge.power >= req;
  ctx.fillStyle = '#14121f'; ctx.fillRect(gx, gy, gw, gh);
  if (phase === 'CHARGE') { ctx.fillStyle = flipOk ? '#ffd447' : '#ff5d5d'; ctx.fillRect(gx, gy, gw * charge.power, gh); }
  // 뒤집기 가능 마크: 필요 파워 위치 (상대 기울어짐 스택에 따라 이동)
  const mx = gx + gw * req;
  ctx.fillStyle = '#ffd447'; ctx.fillRect(mx - 1.5, gy - 6, 3, gh + 12);
  ctx.beginPath(); ctx.moveTo(mx, gy + gh + 6); ctx.lineTo(mx - 7, gy + gh + 18); ctx.lineTo(mx + 7, gy + gh + 18); ctx.closePath(); ctx.fill();
  ctx.textAlign = 'center'; ctx.font = '12px monospace';
  ctx.fillText(`뒤집기 가능 ${Math.round(req * 100)}%`, Math.min(W - 62, Math.max(62, mx)), gy + gh + 32);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(gx, gy, gw, gh);
  ctx.font = '16px monospace'; ctx.fillStyle = '#fff';
  ctx.fillText(phase === 'CHARGE' ? `파워 ${(charge.power * 100) | 0}%` : '누르고 있다가 손을 떼면 발사!', W / 2, gy + 82);

  // HUD
  ctx.textAlign = 'left'; ctx.font = '13px monospace'; ctx.fillStyle = '#aab';
  ctx.fillText(`힘${stats.str} 집중${stats.focus} 운${stats.luck} ${item || '-'}  기울어짐 ${target.tiltStacks}`, 12, 22);
  ctx.fillText(`FLIP ${tally.FLIP}  INNER ${tally.INNER}  MISS ${tally.MISS}  WHIFF ${tally.WHIFF}  crit ${tally.crit}`, 12, 42);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); draw(); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
