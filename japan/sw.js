const CACHE_NAME = 'nagoya-2026-v44';
const APP_SHELL = [
  './index.html',
  './manifest.webmanifest',
  './icon-192.svg',
  './icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Fix: Open-Meteo 改用 stale-while-revalidate
  // 離線時仍能顯示前次快取的天氣，而非直接失敗
  if (url.hostname === 'api.open-meteo.com') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        fetch(event.request)
          .then((response) => {
            cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => cache.match(event.request))
      )
    );
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        // Stale-while-revalidate：先回傳快取版本，背景更新
        // 讓離線或弱網路時開啟速度更快
        const cached = await cache.match('./index.html');
        const fetchPromise = fetch(event.request).then((response) => {
          event.waitUntil(cache.put('./index.html', response.clone()));
          return response;
        }).catch(() => null);
        return cached || fetchPromise;
      })
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});
