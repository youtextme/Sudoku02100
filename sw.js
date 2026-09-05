// Sudoku02100 service worker - offline-first cache.
// Update CACHE_VERSION to force a refresh of the app shell.

const CACHE_VERSION = 'sudoku2100-v6';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tokens.css',
  './css/base.css',
  './css/app.css',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './src/app.js',
  './src/platform/events.js',
  './src/platform/grid/grid-engine.js',
  './src/platform/grid/grid-view.js',
  './src/platform/progress.js',
  './src/platform/pwa.js',
  './src/platform/session.js',
  './src/platform/sound.js',
  './src/platform/store.js',
  './src/platform/ui/confetti.js',
  './src/platform/ui/dom.js',
  './src/platform/ui/modal.js',
  './src/platform/ui/toast.js',
  './src/platform/util.js',
  './src/sudoku/coach.js',
  './src/sudoku/curriculum.js',
  './src/sudoku/generator.js',
  './src/sudoku/rules.js',
  './src/sudoku/saves.js',
  './src/sudoku/strategies.js',
  './src/sudoku/views/free.js',
  './src/sudoku/views/home.js',
  './src/sudoku/views/learn.js',
  './src/sudoku/views/parents.js',
  './src/sudoku/views/play.js',
  './src/sudoku/views/progress.js',
  './src/sudoku/views/reset.js',
  './src/sudoku/views/settings.js',
  './src/sudoku/views/shared.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Navigations: network first, cached shell as fallback (fresh updates when online).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put('./', copy));
          return response;
        })
        .catch(() => caches.match('./').then((r) => r || caches.match('./index.html'))),
    );
    return;
  }

  // Same-origin assets: cache first, network fallback + fill cache in background.
  if (new URL(request.url).origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      }),
    );
  }
});