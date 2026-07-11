// Service worker: офлайн-кэш.
// Стратегия: КОД (html/js/json/css/иконки) — network-first (всегда свежий, офлайн — из кэша);
// тяжёлое (wasm + модель Kiwi) — cache-first (не качать 35 МБ повторно).
const CACHE = 'ksl-mobile-v2';

const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './js/app.js', './js/analyzer.js', './js/lesson.js', './js/render.js',
  './js/romanize.js', './js/style.js',
  './lib/index.js', './lib/kiwi.js', './lib/kiwi-api.js', './lib/kiwi-builder.js',
  './lib/build-args.js', './lib/util.js', './lib/build/kiwi-wasm.js',
  './data/grammar_db.json', './data/vocab_dict.json', './data/phrases.json', './data/particles.json',
  './icons/icon-192.png', './icons/icon-512.png',
];

const isHeavy = (url) => url.pathname.includes('/model/') || url.pathname.endsWith('.wasm');

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(SHELL.map((u) => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // LRCLIB и пр. — напрямую в сеть

  if (isHeavy(url)) {
    // cache-first для wasm/модели
    e.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res && res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
      return res;
    })());
  } else {
    // network-first для кода/данных (свежий код; офлайн — из кэша)
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res && res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
        return res;
      } catch (err) {
        const cached = await caches.match(req);
        return cached || Response.error();
      }
    })());
  }
});
