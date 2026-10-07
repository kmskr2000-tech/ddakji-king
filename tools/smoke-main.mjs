// main.js 스모크: DOM/Canvas 스텁으로 입력→차지→발사→판정 루프를 구동.
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => ((t[k] = v), true) });
const listeners = {};
const cv = { getContext: () => ctx, style: {}, addEventListener: (e, f) => (listeners[e] = f), width: 0, height: 0 };
globalThis.document = { getElementById: () => cv };
globalThis.window = globalThis;
globalThis.innerWidth = 420; globalThis.innerHeight = 800; globalThis.devicePixelRatio = 2;
globalThis.location = { search: '?str=3&focus=4&luck=3&item=tape' };
globalThis.addEventListener = (e, f) => (listeners['w:' + e] = f);
let t = 0; let cb;
globalThis.performance = { now: () => t };
globalThis.requestAnimationFrame = (f) => { cb = f; };
await import('../js/main.js');
const tick = (ms) => { t += ms; const f = cb; f(t); };
for (let shot = 0; shot < 40; shot++) {
  listeners.pointerdown({ preventDefault: noop });
  for (let i = 0; i < 20 + shot * 3; i++) tick(16.7);
  listeners['w:pointerup']();
  for (let i = 0; i < 130; i++) tick(16.7);
  if (process.env.DBG) console.log(shot, JSON.stringify(globalThis.__ddakji.tally));
}
const L = globalThis.__ddakji;
const n = L.tally.FLIP + L.tally.INNER + L.tally.MISS + L.tally.WHIFF;
console.log('shots judged:', n, L.tally, 'last:', L.last);
if (n !== 40) { console.error('expected 40 judged'); process.exit(1); }
console.log('SMOKE PASS');
