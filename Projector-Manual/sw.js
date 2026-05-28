// PT-RQ35K 選單導覽 — Service Worker V6
// GitHub Pages 子路徑 /Work-Workspace/Projector-Manual/

const CACHE_NAME = 'projector-v6';
const BASE = '/Work-Workspace/Projector-Manual/';

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll([
                BASE,
                BASE + 'index.html',
                BASE + 'manifest.json'
            ]).catch(err => console.warn('[SW] Cache partial fail:', err));
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    const isExternal = (
        url.hostname !== self.location.hostname ||
        url.hostname.includes('googleapis') ||
        url.hostname.includes('fonts.gstatic')
    );

    if (isExternal) {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response && response.status === 200) {
                    const cloned = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then(cached => {
                    if (cached) return cached;
                    return caches.match(BASE + 'index.html');
                });
            })
    );
});
