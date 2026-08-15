const CACHE_NAME = 'edubase-v8';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/config.js',
  './js/icons.js',
  './js/store.js',
  './js/data.js',
  './js/api.js',
  './js/views.js',
  './js/app.js',
  './manifest.json',
  './favicon.ico',
  './assets/images/logo.png',
  './assets/images/icon-192.png',
  './assets/images/icon-512.png',
  './assets/images/splash.png',
  './assets/images/arvore.png',
  './assets/images/documento.png',
  './assets/images/documento2.png',
  './assets/images/sobre.png',
  './assets/images/sobre-sem-fundo.png',
  './assets/images/recurso.png',
  './assets/images/recurso-sem-fundo.png',
  './assets/images/documento-sem-fundo.png',
  './assets/images/priscila.png',
  './assets/images/UERN.png',
  './assets/images/PROFEI.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
