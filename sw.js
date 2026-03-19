const CACHE_NAME = 'shopping-pwa-v1';
const BASE_PATH = '/repo-name/'; 
const urlsToCache = [
  `${BASE_PATH}index.html`,
  `${BASE_PATH}style.css`,
  `${BASE_PATH}app.js`,
  `${BASE_PATH}firebase.js`,
  `${BASE_PATH}manifest.json`
];
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache.map(url => new Request(url, {cache: 'reload'}))))
      .catch(err => console.error('Cache addAll failed:', err))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(() => fetch(event.request))
  );
});
