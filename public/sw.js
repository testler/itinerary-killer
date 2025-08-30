/* eslint-env serviceworker, browser */
/* global self, caches, fetch, Response, URL, console */
// Service Worker for Itinerary Killer App
// Provides offline support, caching, and performance optimization

const CACHE_NAME = 'itinerary-cache-v2';
const STATIC_CACHE = 'static-v2';
const DYNAMIC_CACHE = 'dynamic-v2';
const MAP_CACHE = 'map-tiles-v1';

// Derive base path from registration scope (works on subfolders like /itinerary-killer/)
// If scope is https://host/path/, basePath becomes /path/
const SCOPE_URL = (self.registration && self.registration.scope) || '/';
const BASE_PATH = (() => {
  try {
    const url = new URL(SCOPE_URL);
    return url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
  } catch {
    return '/';
  }
})();

function withBase(path) {
  const a = BASE_PATH.replace(/\/+$/, '/');
  const b = String(path).replace(/^\/+/, '');
  return a + b;
}

// Critical resources to cache immediately
const STATIC_ASSETS = [
  withBase('/'),
  withBase('index.html'),
  withBase('manifest.webmanifest'),
  withBase('icons/icon-192.png'),
  withBase('icons/icon-512.png')
];

// Core app assets
const CORE_ASSETS = [
  withBase('src/main.tsx'),
  withBase('src/App.tsx'),
  withBase('src/index.css')
];

// Map tile patterns to cache
const MAP_TILE_PATTERNS = [
  'https://tile.openstreetmap.org/',
  'https://a.tile.openstreetmap.org/',
  'https://b.tile.openstreetmap.org/',
  'https://c.tile.openstreetmap.org/'
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== MAP_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated successfully');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle map tile requests
  if (isMapTileRequest(url)) {
    event.respondWith(handleMapTileRequest(request));
    return;
  }
  
  // Handle API requests
  if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
    return;
  }
  
  // Handle static assets
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }
  
  // Handle navigation requests (SPA routing)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }
});

// Check if request is for map tiles
function isMapTileRequest(url) {
  return MAP_TILE_PATTERNS.some(pattern => url.href.startsWith(pattern));
}

// Check if request is for API
function isAPIRequest(url) {
  return url.pathname.includes('/api/') || 
         url.hostname.includes('spacetimedb') ||
         url.hostname.includes('localhost');
}

// Check if request is for static assets
function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/);
}

// Handle map tile requests with intelligent caching
async function handleMapTileRequest(request) {
  const cache = await caches.open(MAP_CACHE);
  
  try {
    // Try to serve from cache first
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('🗺️ Map tile served from cache:', request.url);
      return cachedResponse;
    }
    
    // Fetch from network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      cache.put(request, responseClone);
      console.log('🗺️ Map tile cached:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🌐 Map tile fetch failed, serving from cache if available');
    
    // Try to serve any cached version
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline placeholder
    return new Response('Map tile unavailable offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Handle API requests with offline support
async function handleAPIRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  try {
    // Try network first for API requests
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('📡 API request failed, checking cache...');
    
    // Try to serve from cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('💾 API response served from cache');
      return cachedResponse;
    }
    
    // Return offline response
    return new Response(JSON.stringify({
      error: 'Service unavailable offline',
      message: 'Please check your connection and try again'
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

// Handle static asset requests
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  
  try {
    // Try cache first for static assets
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fetch from network if not cached
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('📦 Static asset fetch failed');
    
    // Return offline placeholder
    return new Response('Asset unavailable offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Handle navigation requests (SPA routing)
async function handleNavigationRequest(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('🧭 Navigation request failed, serving offline page');
    
    // Return cached index.html for offline navigation
    const cache = await caches.open(STATIC_CACHE);
    const offlineResponse = await cache.match(withBase('index.html'));
    
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Fallback offline page
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Itinerary Killer - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              text-align: center; 
              padding: 2rem; 
              background: #f8fafc; 
            }
            .offline-icon { font-size: 4rem; margin-bottom: 1rem; }
            .retry-btn { 
              background: #3b82f6; 
              color: white; 
              border: none; 
              padding: 0.75rem 1.5rem; 
              border-radius: 8px; 
              cursor: pointer; 
              margin-top: 1rem; 
            }
          </style>
        </head>
        <body>
          <div class="offline-icon">📱</div>
          <h1>You're Offline</h1>
          <p>Itinerary Killer needs an internet connection to work properly.</p>
          <button class="retry-btn" onclick="window.location.reload()">
            Try Again
          </button>
        </body>
      </html>
    `, {
      status: 200,
      headers: {
        'Content-Type': 'text/html'
      }
    });
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(performBackgroundSync());
  }
});

// Perform background sync
async function performBackgroundSync() {
  try {
    console.log('🔄 Performing background sync...');
    
    // Get all clients
    const clients = await self.clients.matchAll();
    
    // Notify clients that sync is happening
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_START',
        message: 'Syncing offline data...'
      });
    });
    
    // Perform sync operations here
    // This could include:
    // - Syncing offline itinerary changes
    // - Uploading cached data
    // - Refreshing cached content
    
    console.log('✅ Background sync completed');
    
    // Notify clients that sync is complete
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_COMPLETE',
        message: 'Sync completed successfully'
      });
    });
  } catch (error) {
    console.error('❌ Background sync failed:', error);
    
    // Notify clients of sync failure
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_ERROR',
        message: 'Sync failed, will retry later'
      });
    });
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification received');
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New notification from Itinerary Killer',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: data.data || {},
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Itinerary Killer', options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification clicked');
  
  event.notification.close();
  
  if (event.action) {
    console.log('Action clicked:', event.action);
    // Handle specific notification actions
  } else {
    // Default action - focus or open the app
    event.waitUntil(
      self.clients.matchAll({ type: 'window' })
        .then((clients) => {
          if (clients.length > 0) {
            // Focus existing window
            return clients[0].focus();
          } else {
            // Open new window
            return self.clients.openWindow(BASE_PATH);
          }
        })
    );
  }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('📨 Message received in service worker:', event.data);
  
  switch (event.data.type) {
    case 'CACHE_MAP_TILES':
      handleCacheMapTiles(event.data.tiles);
      break;
      
    case 'CLEAR_CACHE':
      handleClearCache(event.data.cacheName);
      break;
      
    case 'GET_CACHE_INFO':
      handleGetCacheInfo(event.ports[0]);
      break;
      
    default:
      console.log('Unknown message type:', event.data.type);
  }
});

// Handle map tile caching request
async function handleCacheMapTiles(tiles) {
  const cache = await caches.open(MAP_CACHE);
  
  try {
    const promises = tiles.map(async (tileUrl) => {
      const response = await fetch(tileUrl);
      if (response.ok) {
        await cache.put(tileUrl, response.clone());
        return { url: tileUrl, status: 'cached' };
      }
      return { url: tileUrl, status: 'failed' };
    });
    
    const results = await Promise.all(promises);
    console.log('🗺️ Map tile caching results:', results);
    
    return results;
  } catch (error) {
    console.error('❌ Failed to cache map tiles:', error);
    throw error;
  }
}

// Handle cache clearing request
async function handleClearCache(cacheName) {
  try {
    if (cacheName) {
      await caches.delete(cacheName);
      console.log('🗑️ Cache cleared:', cacheName);
    } else {
      // Clear all caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('🗑️ All caches cleared');
    }
  } catch (error) {
    console.error('❌ Failed to clear cache:', error);
    throw error;
  }
}

// Handle cache info request
async function handleGetCacheInfo(port) {
  try {
    const cacheNames = await caches.keys();
    const cacheInfo = {};
    
    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      cacheInfo[name] = {
        size: keys.length,
        urls: keys.map(req => req.url)
      };
    }
    
    port.postMessage({
      type: 'CACHE_INFO',
      data: cacheInfo
    });
  } catch (error) {
    console.error('❌ Failed to get cache info:', error);
    port.postMessage({
      type: 'CACHE_INFO_ERROR',
      error: error.message
    });
  }
}

console.log('🚀 Service Worker loaded successfully');


