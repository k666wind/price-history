const CACHE_NAME = 'shopping-pwa-v2'; // Fix: bump version so updated assets 唔會俾舊 cache 卡住

// Replace 'your-repo-name' with your actual GitHub repo name
const BASE_PATH = '/shopping-pwa/';

const urlsToCache = [
  `${BASE_PATH}`,            // index.html via repo root
  `${BASE_PATH}index.html`,
  `${BASE_PATH}style.css`,
  `${BASE_PATH}app.js`,
  `${BASE_PATH}firebase.js`,
  `${BASE_PATH}manifest.json`
];

self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(
        urlsToCache.map(url => new Request(url, { cache: 'reload' }))
      ))
      .then(() => self.skipWaiting()) // Fix: 新 SW 即刻接手，唔使用戶 refresh 兩次
      .catch(err => console.error('[Service Worker] Cache addAll failed:', err))
  );
});

self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()) // Fix: 即刻控制所有開緊嘅 tab
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => {
        // Optional: fallback if offline and resource not cached
        if (event.request.destination === 'document') {
          return caches.match(`${BASE_PATH}index.html`);
        }
      });
    })
  );
});
