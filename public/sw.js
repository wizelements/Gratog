// Service Worker for Taste of Gratitude PWA
// Version: 1.0.0

const CACHE_NAME = 'gratitude-cache-v1';
const RUNTIME_CACHE = 'gratitude-runtime-v1';

// Critical assets to cache immediately
const PRECACHE_URLS = [
  '/',
  '/catalog',
  '/offline',
  '/manifest.json'
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, then cache, with offline fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API calls from cache (always fetch fresh)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // Return offline response for failed API calls
          return new Response(
            JSON.stringify({ error: 'Offline', offline: true }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // Network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone the response
        const responseClone = response.clone();
        
        // Cache successful responses
        if (response.status === 200) {
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        
        return response;
      })
      .catch(() => {
        // Try cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Show offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/offline');
          }
          
          // Return generic offline response
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Background sync for offline payment queue
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-payments') {
    event.waitUntil(syncPayments());
  }
});

async function syncPayments() {
  try {
    // Get pending payments from IndexedDB
    const db = await openDB();
    const payments = await db.getAll('pending-payments');
    
    // Process each payment
    for (const payment of payments) {
      try {
        const response = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payment.data)
        });
        
        if (response.ok) {
          // Remove from queue on success
          await db.delete('pending-payments', payment.id);
        }
      } catch (error) {
        console.error('Sync payment failed:', error);
      }
    }
  } catch (error) {
    console.error('Sync payments error:', error);
  }
}

// Helper function for IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('gratitude-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-payments')) {
        db.createObjectStore('pending-payments', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Push notifications (future feature)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'New update from Taste of Gratitude',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.url || '/'
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Taste of Gratitude', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});
