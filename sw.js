const VERSION = '1792845191';
const CACHE = `ddakji-${VERSION}`;
const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(PRECACHE.map((u) => cache.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('ddakji-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

async function put(req, res) {
  if (res && (res.ok || res.type === 'opaque')) {
    try { const c = await caches.open(CACHE); await c.put(req, res.clone()); } catch (_) {}
  }
  return res;
}

async function networkFirst(req) {
  try {
    return await put(req, await fetch(req));
  } catch (err) {
    const hit = await caches.match(req, { ignoreSearch: true }) || await caches.match('index.html') || await caches.match('./');
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  return put(req, await fetch(req));
}

async function staleWhileRevalidate(req) {
  const hit = await caches.match(req);
  const net = fetch(req).then((r) => put(req, r)).catch(() => hit);
  return hit || net;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(staleWhileRevalidate(req));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/assets/version.json')) {
    e.respondWith(fetch(req, { cache: 'no-store' }));
    return;
  }
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    e.respondWith(networkFirst(req));
    return;
  }
  e.respondWith(cacheFirst(req));
});
