// icons/icon.svg -> PNG 아이콘들 생성. 실행: node tools/make-icons.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(path.join(root, 'icons/icon.svg'), 'utf8');
const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
];
const browser = await chromium.launch();
try {
  for (const [name, size] of targets) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`<!doctype html><html><body style="margin:0;background:#2b2640">` +
      `<div style="width:${size}px;height:${size}px">${svg.replace('<svg ', `<svg style="display:block;width:${size}px;height:${size}px" `)}</div></body></html>`);
    await page.screenshot({ path: path.join(root, 'icons', name), clip: { x: 0, y: 0, width: size, height: size } });
    await page.close();
    console.log('wrote icons/' + name);
  }
} finally {
  await browser.close();
}
