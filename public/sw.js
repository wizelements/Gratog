const CACHE_NAME = 'gratog-v1';
const RUNTIME_CACHE = 'gratog-runtime-v1';
const API_CACHE = 'gratog-api-v1';
const IMAGE_CACHE = 'gratog-images-v1';

// Files to cache on install
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Caching precache URLs');
      await Promise.allSettled(
        PRECACHE_URLS.map((url) => cache.add(url))
      );
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== RUNTIME_CACHE && 
              cacheName !== API_CACHE && 
              cacheName !== IMAGE_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network-first with fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip non-HTTPS (except localhost)
  if (url.protocol !== 'https:' && !url.hostname.includes('localhost')) {
    return;
  }

  // API requests - Network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    if (shouldBypassApiCache(url.pathname)) {
      event.respondWith(networkOnlyApi(request));
    } else {
      event.respondWith(apiStrategy(request));
    }
  }
  // Image requests - Cache first, fallback to network
  else if (isImageRequest(request)) {
    event.respondWith(imageStrategy(request));
  }
  // HTML/JS/CSS - Network first with cache fallback
  else {
    event.respondWith(networkFirstStrategy(request));
  }
});

// Network first strategy
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Network failed, checking cache:', request.url);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
    }
    return new Response('Offline - Content unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain'
      })
    });
  }
}

function shouldBypassApiCache(pathname) {
  return pathname.startsWith('/api/products') ||
    pathname.startsWith('/api/markets') ||
    pathname.startsWith('/api/admin/products/sync') ||
    pathname.startsWith('/api/admin/markets');
}

// Network-only for critical freshness paths.
async function networkOnlyApi(request) {
  try {
    return await fetch(request, { cache: 'no-store' });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'API unavailable offline' }),
      {
        status: 503,
        headers: new Headers({
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        })
      }
    );
  }
}

// API strategy - Network first with 5s timeout
async function apiStrategy(request) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('API timeout')), 5000)
  );

  try {
    const response = await Promise.race([fetch(request), timeout]);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] API failed, checking cache:', request.url);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return new Response(
      JSON.stringify({ error: 'API unavailable offline' }),
      {
        status: 503,
        headers: new Headers({
          'Content-Type': 'application/json'
        })
      }
    );
  }
}

// Image strategy - Cache first
async function imageStrategy(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Image fetch failed:', request.url);
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#f0f0f0" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="#999">Offline</text></svg>',
      {
        headers: { 'Content-Type': 'image/svg+xml' }
      }
    );
  }
}

// Check if request is for an image
function isImageRequest(request) {
  return /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(request.url);
}

// Background sync for offline orders
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

async function syncOrders() {
  try {
    const db = await openDB('GratogDB');
    const orders = await getAllFromStore(db, 'pendingOrders');
    
    for (const order of orders) {
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(order)
        });
        
        if (response.ok) {
          await deleteFromStore(db, 'pendingOrders', order.id);
        }
      } catch (error) {
        console.log('[SW] Sync failed for order:', order.id);
      }
    }
  } catch (error) {
    console.log('[SW] Background sync failed:', error);
  }
}

// Simple IndexedDB helper
function openDB(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingOrders')) {
        db.createObjectStore('pendingOrders', { keyPath: 'id' });
      }
    };
  });
}

function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function deleteFromStore(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// Push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: data.tag || 'notification',
      requireInteraction: data.requireInteraction || false,
      data: data.data || {}
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windows) => {
      if (windows.length > 0) {
        windows[0].focus();
        windows[0].postMessage({
          type: 'NOTIFICATION_CLICK',
          data: event.notification.data
        });
      } else {
        clients.openWindow(event.notification.data.url || '/');
      }
    })
  );
});
