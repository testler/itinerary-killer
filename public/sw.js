const CACHE_NAME = 'ik-static-v1';
const RUNTIME_CACHE = 'ik-runtime-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => ![CACHE_NAME, RUNTIME_CACHE].includes(k)).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Network-aware strategies
function isFastConnection() {
  const nav = self.navigator;
  const effective = nav && 'connection' in nav && nav.connection && nav.connection.effectiveType;
  return effective === 'wifi' || effective === 'ethernet' || effective === '4g';
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass non-GET
  if (event.request.method !== 'GET') return;

  // HTML navigation: Network-first with fallback to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
        return resp;
      }).catch(() => caches.match('/') || caches.match('/index.html'))
    );
    return;
  }

  // Static assets: Cache-first
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/assets') || url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) {
      event.respondWith(
        caches.match(event.request).then((cached) => cached || fetch(event.request).then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return resp;
        }))
      );
      return;
    }
  }

  // Leaflet tiles: Stale-while-revalidate with cap
  if (/tile\.openstreetmap\.org\//.test(url.hostname)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request).then((resp) => {
          cache.put(event.request, resp.clone());
          return resp;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Google Places and other APIs: network-first when fast, cache-first otherwise
  if (/googleapis\.com\/.test(url.hostname)) {
    if (isFastConnection()) {
      event.respondWith(
        fetch(event.request).then((resp) => {
          const copy = resp.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(event.request, copy));
          return resp;
        }).catch(() => caches.match(event.request))
      );
    } else {
      event.respondWith(
        caches.match(event.request).then((cached) => cached || fetch(event.request))
      );
    }
    return;
  }

  // Default: try cache, fall back to network
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((resp) => {
      const copy = resp.clone();
      caches.open(RUNTIME_CACHE).then((c) => c.put(event.request, copy));
      return resp;
    }).catch(() => cached))
  );
});


