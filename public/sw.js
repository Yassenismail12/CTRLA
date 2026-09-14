// Service Worker for "بيلو يلعب" PWA
const CACHE_NAME = 'bello-cache-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/style.css?v=23',
  '/game.js?v=23',
  '/manifest.json',
  '/assets/character_avatar.png?v=3',
  '/assets/logo_yly.png',
  '/assets/logo_ministry.png?v=2',
  '/assets/logo_season8.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('SW cache.addAll partially failed (non-blocking):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Always let non-GET and API requests go directly to network
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  // Network-First with Cache fallback strategy
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache valid responses for static assets
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
