// 브라우저 스모크: 정적 서버 → Chromium으로 타이틀→홈→지도→대결(자동)→결과→각 메뉴를 실제 클릭으로 순회.
// 사용: node tools/smoke-browser.mjs [스크린샷 폴더]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = process.argv[2] || '';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(root, u === '/' ? 'index.html' : u);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 820 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ERR_|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.goto(`http://localhost:${port}/`);
await page.waitForFunction(() => window.__ddakji?.App?.sceneName === 'title', null, { timeout: 8000 });

const wait = (ms) => page.waitForTimeout(ms);
const shot = async (name) => { if (out) await page.screenshot({ path: path.join(out, name + '.png') }); };
const scene = () => page.evaluate(() => window.__ddakji.App.sceneName);
async function tapXY(x, y) { const p = await page.evaluate(([a, b]) => window.__ddakji.toClient(a, b), [x, y]); await page.mouse.click(p.x, p.y); await wait(120); }
async function tap(id) {
  const b = await page.evaluate((i) => window.__ddakji.find(i), id);
  if (!b) throw new Error('button not found: ' + id + ' in scene ' + (await scene()));
  await tapXY(b.x, b.y);
}
async function until(fn, ms = 15000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn)) return; await wait(100); } throw new Error('timeout: ' + fn); }

await wait(800); await shot('01-title');
await tapXY(210, 400); await until(() => window.__ddakji.App.sceneName === 'home'); await wait(700);
await shot('02-home-daily');
await tap('claim1'); await wait(500);
const coins0 = await page.evaluate(() => window.__ddakji.App.S.coins);
await shot('03-home');
await tap('play'); await until(() => window.__ddakji.App.sceneName === 'map'); await wait(600);
await shot('04-map');
await tap('opp-p1'); await wait(500); await shot('05-prep');
await tap('item-coin500'); await wait(200);
await tap('fight'); await until(() => window.__ddakji.App.sceneName === 'battle'); await wait(1200);
await shot('06-vs');
await page.evaluate(() => { window.__ddakji.auto = true; });
// 내 차례 조준 화면 캡처
await until(() => window.__ddakji.battle()?.state === 'charge' || window.__ddakji.battle()?.state === 'oppWind', 15000); await wait(300);
await shot('07-battle');
await until(() => window.__ddakji.App.sceneName === 'result', 90000); await wait(1800);
await shot('08-result');
const b = await page.evaluate(() => ({ S: window.__ddakji.App.S }));
console.log('after battle: coins', coins0, '→', b.S.coins, 'record', JSON.stringify(b.S.record), 'tutorial', b.S.tutorial);
await tap('home'); await until(() => window.__ddakji.App.sceneName === 'home'); await wait(500);
await tap('upgrade'); await until(() => window.__ddakji.App.sceneName === 'upgrade'); await wait(500);
const lv0 = await page.evaluate(() => window.__ddakji.App.S.stats.str);
await tap('up-str'); await wait(400);
const lv1 = await page.evaluate(() => window.__ddakji.App.S.stats.str);
console.log('upgrade str', lv0, '→', lv1);
await shot('09-upgrade');
await tap('back'); await until(() => window.__ddakji.App.sceneName === 'home'); await wait(400);
await page.evaluate(() => { window.__ddakji.App.S.coins += 1000; });
await tap('shop'); await until(() => window.__ddakji.App.sceneName === 'shop'); await wait(500);
await tap('pull'); await wait(2200); await shot('10-gacha');
await tap('revok'); await wait(300);
await tap('tab-i'); await wait(300); await tap('buy-tape'); await wait(300); await shot('11-items');
await tap('back'); await until(() => window.__ddakji.App.sceneName === 'home'); await wait(400);
await tap('collection'); await until(() => window.__ddakji.App.sceneName === 'collection'); await wait(500);
await tap('dk-starter'); await wait(500); await shot('12-collection');
await tap('dclose'); await wait(300);
await tap('back'); await until(() => window.__ddakji.App.sceneName === 'home'); await wait(400);
await tap('settings'); await wait(400); await shot('13-settings');
await tap('close'); await wait(300);
// 보스전 화면 확인 (지역 6 보스로 직행)
await page.evaluate(() => { window.__ddakji.go('battle', { opp: 'p30' }); window.__ddakji.auto = true; });
await until(() => ['aim', 'charge', 'oppWind'].includes(window.__ddakji.battle()?.state), 20000); await wait(400);
await shot('14-boss');
await until(() => window.__ddakji.App.sceneName === 'result', 120000); await wait(1500);
await shot('15-boss-result');
const saved = await page.evaluate(() => localStorage.getItem('ddakji-king-save-v1')?.length || 0);
console.log('save bytes', saved);
await browser.close(); server.close();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
if (lv1 !== lv0 + 1) { console.error('upgrade failed'); process.exit(1); }
console.log('BROWSER SMOKE PASS');
