const CACHE_NAME = 'shopping-pwa-v2';
const BASE_PATH = '/shopping-pwa/';

const urlsToCache = [
  `${BASE_PATH}`,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}style.css`,
  `${BASE_PATH}app.js`,
  `${BASE_PATH}firebase.js`,
  `${BASE_PATH}manifest.json`,
  `${BASE_PATH}icon.png`,
  `${BASE_PATH}icon-512.png`,
  `${BASE_PATH}price-history-banner.png`
];

// ✅ Install: cache all assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  // ✅ Skip waiting so new SW activates immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(
        urlsToCache.map(url => new Request(url, { cache: 'reload' }))
      ))
      .catch(err => console.error('[Service Worker] Cache addAll failed:', err))
  );
});

// ✅ Activate: clear old caches and claim clients immediately
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => {
      // ✅ Take control of all open clients without requiring a reload
      return self.clients.claim();
    })
  );
});

// ✅ Fetch: Cache-First for static assets, Network-First for Firestore/API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Let Firestore and external API calls go through the network directly
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('cdn.jsdelivr.net')
  ) {
    return; // Don't intercept — let browser handle normally
  }

  // Cache-First for local assets
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;
      return fetch(event.request).then(networkResponse => {
        // Optionally cache new responses
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => {
        // Offline fallback for document requests
        if (event.request.destination === 'document') {
          return caches.match(`${BASE_PATH}index.html`);
        }
      });
    })
  );
});
