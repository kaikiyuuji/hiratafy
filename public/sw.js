const CACHE_PREFIX = 'hiratafy-';
const SHELL_CACHE = `${CACHE_PREFIX}shell-2026-08-22-v2`;
const ASSET_CACHE = `${CACHE_PREFIX}assets-2026-08-22-v2`;

const APP_SHELL = [
    '/offline.html',
    '/manifest.webmanifest',
    '/hiratafy-icon.png',
    '/apple-touch-icon.png',
    '/pwa/icon-192.png',
    '/pwa/icon-512.png',
    '/pwa/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter(
                            (key) =>
                                key.startsWith(CACHE_PREFIX) &&
                                key !== SHELL_CACHE &&
                                key !== ASSET_CACHE,
                        )
                        .map((key) => caches.delete(key)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('fetch', (event) => {
    const request = event.request;

    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(networkNavigation(request));

        return;
    }

    if (isPublicAsset(url.pathname)) {
        event.respondWith(staleWhileRevalidate(request));
    }
});

function isPublicAsset(pathname) {
    return pathname.startsWith('/build/') || APP_SHELL.includes(pathname);
}

async function networkNavigation(request) {
    try {
        return await fetch(request);
    } catch {
        return (
            (await caches.match('/offline.html')) ??
            new Response('Hiratafy está offline.', {
                status: 503,
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
        );
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(ASSET_CACHE);
    const cachedResponse = await caches.match(request);
    const networkResponse = fetch(request)
        .then((response) => {
            if (response.ok && response.type === 'basic') {
                void cache.put(request, response.clone());
            }

            return response;
        })
        .catch(() => undefined);

    return cachedResponse ?? (await networkResponse) ?? Response.error();
}
