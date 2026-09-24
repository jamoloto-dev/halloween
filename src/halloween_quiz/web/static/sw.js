/**
 * 🎃 Halloween Quiz - Service Worker
 * Versioned caching, offline fallback shell, and stale cache cleanup.
 */

const CACHE_NAME = "spooky-master-v2.6.0";
const PRECACHE_ASSETS = [
    "/",
    "/play",
    "/play/session",
    "/results",
    "/journey",
    "/daily-haunt",
    "/duels",
    "/progress",
    "/leaderboard",
    "/pass",
    "/settings",
    "/hunters",
    "/hunter-studio",
    "/offline.html",
    "/privacy",
    "/static/style.css?v=20260924-spooky-master-v2.6.0",
    "/static/app.js?v=20260924-spooky-master-v2.6.0",
    "/static/js/main.js",
    "/static/js/modules/router.js",
    "/static/js/modules/utils.js",
    "/static/js/modules/audio.js",
    "/static/js/modules/campaign.js",
    "/static/js/modules/hints.js",
    "/static/js/modules/hunter-studio.js",
    "/static/js/modules/quiz.js",
    "/static/js/modules/profile.js",
    "/static/js/modules/leaderboard.js",
    "/static/js/modules/duels.js",
    "/static/js/modules/settings.js",
    "/static/js/modules/pwa.js",
    "/static/ui.js",
    "/static/favicon.svg",
    "/static/logo.svg",
    "/static/icon-192.png",
    "/static/icon-512.png",
    "/static/manifest.json",
    "/sounds/spooky-master-main.mp3",
    "/sounds/ui-click.wav",
    "/sounds/category-select.wav",
    "/sounds/quiz-start.wav",
    "/sounds/answer-correct.wav",
    "/sounds/answer-incorrect.wav"
];

// Install: precache offline shell and core assets
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                console.warn("[SW] Service worker precache partial warning:", err);
            });
        }).then(() => self.skipWaiting())
    );
});

// Activate: purge stale legacy caches (including old halloween-quiz-* and earlier versions)
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => {
                    console.log("[SW] Deleting stale cache:", key);
                    return caches.delete(key);
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: Stale-while-revalidate for static assets, network-first for navigation with offline fallback
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
                    if (response && response.status === 200) {
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

    // Static assets and audio: Stale-While-Revalidate with background cache update
    if (url.pathname.startsWith("/static/") || url.pathname.startsWith("/sounds/")) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                const networkFetch = fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return networkResponse;
                }).catch(() => null);

                return cachedResponse || networkFetch;
            })
        );
    }
});
