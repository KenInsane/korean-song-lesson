// Service worker.
// КОД/ДАННЫЕ (html/js/json/css/шрифты/иконки): network-first БЕЗ HTTP-кэша —
//   всегда берём свежую версию (обходит 10-мин кэш GitHub Pages), офлайн — из Cache Storage.
// ТЯЖЁЛОЕ (wasm + модель Kiwi): cache-first — не перекачиваем 35 МБ.
const CACHE = 'ksl-mobile-v3';

const isHeavy = (url) => url.pathname.includes('/model/') || url.pathname.endsWith('.wasm');

self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // LRCLIB и пр. — напрямую

  if (isHeavy(url)) {
    e.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res && res.ok) { (await caches.open(CACHE)).put(req, res.clone()); }
      return res;
    })());
  } else {
    e.respondWith((async () => {
      try {
        const res = await fetch(req.url, { cache: 'no-store' });
        if (res && res.ok) { (await caches.open(CACHE)).put(req, res.clone()); }
        return res;
      } catch (err) {
        const cached = await caches.match(req);
        return cached || Response.error();
      }
    })());
  }
});
