// SourceRating Service Worker for PWA
const CACHE_NAME = "sourcerating-pwa-v1";
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  OFFLINE_URL,
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/icon.svg"
];

// Install: pre-cache offline shell and immediately activate
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate: clean up outdated caches and claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch: Network-first for navigation, pass-through for Supabase & APIs, cache-first for icons
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET requests and chrome-extension schemes
  if (req.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // Bypass cache completely for Supabase backend, real-time WebSockets, and Next.js APIs
  if (
    url.hostname.includes("supabase.co") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/")
  ) {
    return;
  }

  // 1. Navigation requests (HTML pages)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match(req).then((cached) => {
          return cached || caches.match(OFFLINE_URL);
        });
      })
    );
    return;
  }

  // 2. Static icons and images
  if (url.pathname.startsWith("/icons/") || url.pathname.endsWith(".ico") || url.pathname.endsWith(".svg")) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Default: Network-first with silent fallback
  event.respondWith(
    fetch(req).catch(() => {
      return caches.match(req);
    })
  );
});

// Allow clients to trigger skipWaiting
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
