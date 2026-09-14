/**
 * 🎃 Halloween Quiz - Service Worker
 * Versioned caching, offline fallback shell, and stale cache cleanup.
 */

const CACHE_NAME = "halloween-quiz-v2.1.0";
const PRECACHE_ASSETS = [
    "/",
    "/offline.html",
    "/privacy",
    "/static/style.css",
    "/static/app.js",
    "/static/ui.js",
    "/static/favicon.svg",
    "/static/logo.svg",
    "/static/icon-192.png",
    "/static/icon-512.png",
    "/static/manifest.json"
];

// Install: precache offline shell and core assets
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                console.warn("Service worker precache partial fail:", err);
            });
        }).then(() => self.skipWaiting())
    );
});

// Activate: purge stale legacy caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: stale-while-revalidate for static assets, network-first for navigation with offline fallback
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests and API calls
    if (request.method !== "GET" || url.pathname.startsWith("/api/")) {
        return;
    }

    // HTML Navigation: Network first, fall back to cached shell or offline.html
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(async () => {
                    const cached = await caches.match(request);
                    if (cached) return cached;
                    const offline = await caches.match("/offline.html");
                    return offline || new Response("<h1>Offline</h1><p>Check your connection.</p>", {
                        headers: { "Content-Type": "text/html" }
                    });
                })
        );
        return;
    }

    // Static assets: Cache first with network fallback
    if (url.pathname.startsWith("/static/") || url.pathname.startsWith("/sounds/")) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    if (response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                });
            })
        );
    }
});
