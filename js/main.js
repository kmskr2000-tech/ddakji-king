// 부트스트랩: 캔버스·입력·루프·씬 등록. 게임 규칙은 aim.js / game.js, 화면은 scene-*.js.
import { App } from './app.js?v=1792845490';
import { UI, view } from './ui.js?v=1792845490';
import { Sound } from './audio.js?v=1792845490';
import { track } from './platform.js?v=1792845490';
import { registerSW, setupInstallPrompt } from './pwa.js?v=1792845490';
import { BattleScene } from './scene-battle.js';
import { TitleScene, HomeScene, MapScene, ResultScene } from './scene-menu.js';
import { AchScene } from './scene-extra.js';
import { UpgradeScene, ShopScene, CollectionScene } from './scene-shop.js';

// 자가업데이트: version.json(no-store) vs window.__V. 다르면 ?v=새버전으로 교체 (같으면 무동작 = 루프 없음)
if (window.__V) {
  fetch('assets/version.json', { cache: 'no-store' }).then((r) => r.json()).then(({ v }) => {
    if (String(v) !== String(window.__V)) location.replace(location.pathname + '?v=' + v);
  }).catch(() => {});
}

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
UI.ctx = ctx;
UI.sfx = (n) => Sound.play(n);

// 논리 해상도: 가로 420 고정, 세로는 화면비에 맞춰 720~900
function resize() {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  view.H = Math.round(Math.min(900, Math.max(720, (innerHeight / Math.max(1, innerWidth)) * view.W)));
  const s = Math.min(innerWidth / view.W, innerHeight / view.H);
  cv.style.width = view.W * s + 'px'; cv.style.height = view.H * s + 'px';
  cv.width = Math.round(view.W * s * dpr); cv.height = Math.round(view.H * s * dpr);
  view.scale = cv.width / view.W;
  ctx.setTransform(cv.width / view.W, 0, 0, cv.height / view.H, 0, 0);
}
addEventListener('resize', resize); resize();

App.scenes = { title: TitleScene, home: HomeScene, map: MapScene, battle: BattleScene, result: ResultScene, upgrade: UpgradeScene, shop: ShopScene, collection: CollectionScene, ach: AchScene };
App.install = setupInstallPrompt();
App.applySettings();

// 입력: 논리 좌표로 변환 → UI 우선, 나머지는 씬
const toLocal = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * view.W / r.width, y: (e.clientY - r.top) * view.H / r.height }; };
let consumed = false, activeId = null;
cv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  Sound.unlock();
  if (activeId !== null) return;            // 멀티터치 무시
  activeId = e.pointerId;
  try { cv.setPointerCapture(e.pointerId); } catch (_) { /* 무시 */ }
  const p = toLocal(e);
  consumed = UI.down(p.x, p.y);
  if (!consumed && App.fadeDir === 0) App.scene?.down?.(p);
});
cv.addEventListener('pointermove', (e) => {
  if (e.pointerId !== activeId) return;
  const p = toLocal(e);
  UI.move(p.x, p.y);
  if (!consumed) App.scene?.move?.(p);
});
const end = (e) => {
  if (e.pointerId !== activeId) return;
  activeId = null;
  const p = toLocal(e);
  UI.up(p.x, p.y);
  if (!consumed) App.scene?.up?.(p);
  consumed = false;
};
cv.addEventListener('pointerup', end);
cv.addEventListener('pointercancel', end);
cv.addEventListener('wheel', (e) => { e.preventDefault(); App.scene?.wheel?.(e.deltaY * view.H / cv.getBoundingClientRect().height); }, { passive: false });
cv.addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('keydown', (e) => {
  if (e.code === 'Space') e.preventDefault();
  Sound.unlock();
  if (App.scene?.key) App.scene.key(e, true);
  else if (!e.repeat && (e.code === 'Space' || e.code === 'Enter') && App.sceneName === 'title') App.go('home');
});
addEventListener('keyup', (e) => App.scene?.key?.(e, false));
document.addEventListener('visibilitychange', () => { if (document.hidden) { App.scene?.blur?.(); App.persist(); } });
addEventListener('pagehide', () => App.persist());

// 루프
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
  App.t += dt; UI.t = App.t;
  App.updateFade(dt);
  App.fx.update(dt);
  App.scene?.update?.(dt);
  UI.begin();
  ctx.save();
  App.scene?.draw?.(ctx);
  if (App.scene && !App.scene.ownFx) App.fx.draw(ctx);
  UI.drawToast(dt);
  if (App.fade > 0) { ctx.fillStyle = `rgba(16,10,28,${App.fade})`; ctx.fillRect(0, 0, view.W, view.H); }
  ctx.restore();
  UI.end();
  requestAnimationFrame(frame);
}

// 폰트 로드(최대 1.5초 대기) 후 시작 → 부트 화면 제거
const fontsReady = document.fonts?.load ? Promise.race([Promise.all([document.fonts.load('20px "Jua"'), document.fonts.load('20px "Do Hyeon"')]), new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve();
fontsReady.catch(() => {}).finally(() => {
  document.getElementById('boot')?.remove();
  App.go('title');
  requestAnimationFrame(frame);
  track('app_open', { v: window.__V });
});
registerSW();

// 테스트·디버그 훅 (smoke-browser.mjs가 사용)
window.__ddakji = {
  App, auto: false, battle: () => BattleScene.debug(), go: (n, p) => App.go(n, p),
  find: (id) => UI.find(id),
  toClient: (x, y) => { const r = cv.getBoundingClientRect(); return { x: r.left + x * r.width / view.W, y: r.top + y * r.height / view.H }; },
};
