const CACHE_NAME = 'dtc-huelva-v3';
const ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './js/data.js',
  './js/ui.js',
  './js/map.js',
  './js/app.js',
  './js/config.js',
  './municipalities.json',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Ignorar peticiones de extensiones del navegador u otros esquemas no HTTP
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((response) => {
        // En caso de que se realicen llamadas dinámicas externas, no cachear
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        // Cachear opcionalmente nuevos archivos locales que se descubran
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Fallback en caso de desconexión absoluta para recursos externos (como fuentes)
      });
    })
  );
});
