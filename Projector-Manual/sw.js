// 投影機選單導覽 — Service Worker V8
// 策略：Stale-While-Revalidate（快取優先，背景更新）
// GitHub Pages 子路徑 /Work-Workspace/Projector-Manual/

const CACHE_NAME = 'projector-v8';
const BASE = '/Work-Workspace/Projector-Manual/';

const PRECACHE = [
    BASE,
    BASE + 'index.html',
    BASE + 'manifest.json',
    BASE + 'PT-RQ35K.html',
    BASE + 'EV-115.html',
    BASE + 'icon-192.png',
    BASE + 'icon-512.png',
    BASE + 'assets/common.css',
    BASE + 'assets/app.js'
];

/* ── Install: 預快取所有核心資源 ── */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE))
            .catch(err => console.warn('[SW] Precache partial fail:', err))
    );
    self.skipWaiting();
});

/* ── Activate: 清除舊版快取 ── */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

/* ── Fetch: Stale-While-Revalidate ── */
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    /* 外部資源（字型等）直接走網路，不快取 */
    const isExternal =
        url.hostname !== self.location.hostname ||
        url.hostname.includes('googleapis') ||
        url.hostname.includes('gstatic');

    if (isExternal) {
        event.respondWith(fetch(event.request));
        return;
    }

    /* Stale-While-Revalidate：有快取立即回傳，同時背景更新 */
    event.respondWith(
        caches.open(CACHE_NAME).then(async cache => {
            const cached = await cache.match(event.request);

            /* 背景發出網路請求，成功後更新快取 */
            const networkFetch = fetch(event.request).then(response => {
                if (response && response.status === 200) {
                    cache.put(event.request, response.clone());
                }
                return response;
            }).catch(() => null); /* 網路失敗時靜默，不影響主流程 */

            /* 有快取就立即回傳（使用者不等待），沒快取才等網路 */
            return cached || networkFetch || cache.match(BASE + 'index.html');
        })
    );
});
