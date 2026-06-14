// AUTO-UPDATE: This version string is replaced at build time by next.config.js headers.
// The browser byte-compares sw.js on every registration check — any change triggers update.
const CACHE_VERSION = 'v14-20260614-hardening';
const CACHE_PREFIX = 'gratog';
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${CACHE_VERSION}`;
const API_CACHE = `${CACHE_PREFIX}-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `${CACHE_PREFIX}-images-${CACHE_VERSION}`;
const MAX_RUNTIME_ENTRIES = 80;
const MAX_API_ENTRIES = 60;
const MAX_IMAGE_ENTRIES = 120;

// Files to cache on install
const PRECACHE_URLS = [
  '/offline.html',
  '/images/gratog-bg.PNG?v=20260309-2',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      console.log('[SW] Caching precache URLs');
      for (const url of PRECACHE_URLS) {
        try {
          const response = await fetch(url, { cache: 'reload' });
          if (response.ok) {
            await cache.put(url, response);
          } else {
            console.warn('[SW] Precache skipped:', url, response.status);
          }
        } catch (error) {
          console.warn('[SW] Precache failed:', url, error);
        }
      }
      await self.skipWaiting();
    })()
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    (async () => {
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }

      const keep = new Set([CACHE_NAME, RUNTIME_CACHE, API_CACHE, IMAGE_CACHE]);
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith(CACHE_PREFIX) && !keep.has(cacheName)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }

          return Promise.resolve();
        })
      );

      // Purge any stale sensitive commerce/admin entries and update infrastructure
      // from surviving caches. Checkout, orders, payments, inventory, admin, and
      // account pages must always be network-truth only.
      const networkOnlyPrefixes = [
        '/admin',
        '/checkout',
        '/cart',
        '/order',
        '/login',
        '/register',
        '/profile',
        '/account',
        '/preorder',
        '/vendor',
        '/api/admin',
        '/api/auth',
        '/api/csrf',
        '/api/orders',
        '/api/payments',
        '/api/checkout',
        '/api/inventory',
        '/api/cart',
        '/api/customer',
        '/api/webhooks',
        '/api/preorder',
        '/api/returns',
        '/api/subscriptions',
      ];
      const infrastructurePaths = ['/sw.js', '/manifest.json'];
      const allCaches = await caches.keys();
      await Promise.all(
        allCaches.map(async (name) => {
          const cache = await caches.open(name);
          const requests = await cache.keys();
          await Promise.all(
            requests
              .filter((req) => {
                const pathname = new URL(req.url).pathname;
                return infrastructurePaths.includes(pathname) ||
                  networkOnlyPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
              })
              .map((req) => cache.delete(req))
          );
        })
      );

      await self.clients.claim();

      // Notify all open tabs to reload with new version
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => {
        client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_VERSION });
      });
    })()
  );
});

// Allow the app to force activation when a new SW is waiting.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch event - route by request type.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  const isLocalhost = url.hostname.includes('localhost');
  const isSameOrigin = url.origin === self.location.origin;
  if ((url.protocol !== 'https:' && !isLocalhost) || !isSameOrigin) {
    return;
  }

  if (isServiceWorkerInfrastructure(url)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(event, request));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    if (shouldBypassApiCache(url.pathname)) {
      event.respondWith(networkOnlyApi(request));
    } else {
      event.respondWith(apiStrategy(request));
    }
    return;
  }

  if (isImageRequest(request, url)) {
    event.respondWith(imageStrategy(request));
    return;
  }

  if (isStaticAssetRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE, MAX_RUNTIME_ENTRIES));
    return;
  }

  event.respondWith(networkFirstStrategy(request));
});

async function navigationStrategy(event, request) {
  try {
    const preloadResponse = await event.preloadResponse;
    if (preloadResponse && preloadResponse.ok) {
      if (shouldCacheRuntimeRequest(new URL(request.url))) {
        const cache = await caches.open(RUNTIME_CACHE);
        await cache.put(request, preloadResponse.clone());
        await trimCache(RUNTIME_CACHE, MAX_RUNTIME_ENTRIES);
      }
      return preloadResponse;
    }

    return await networkFirstStrategy(request, { timeoutMs: 6000 });
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }

    return new Response('Offline - Page unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({ 'Content-Type': 'text/plain' }),
    });
  }
}

// Network first strategy
async function networkFirstStrategy(request, options = {}) {
  const { timeoutMs = 5000 } = options;
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Network timeout')), timeoutMs)
  );

  try {
    const response = await Promise.race([fetch(request), timeout]);
    if (isCacheableResponse(response) && shouldCacheRuntimeRequest(new URL(request.url))) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
      await trimCache(RUNTIME_CACHE, MAX_RUNTIME_ENTRIES);
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
        'Content-Type': 'text/plain',
      }),
    });
  }
}

function shouldBypassApiCache(pathname) {
  return pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/csrf') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/orders') ||
    pathname.startsWith('/api/payments') ||
    pathname.startsWith('/api/checkout') ||
    pathname.startsWith('/api/inventory') ||
    pathname.startsWith('/api/cart') ||
    pathname.startsWith('/api/customer') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/api/preorder') ||
    pathname.startsWith('/api/returns') ||
    pathname.startsWith('/api/subscriptions') ||
    pathname.startsWith('/api/reviews') ||
    pathname.startsWith('/api/products') ||
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
          'Cache-Control': 'no-store',
        }),
      }
    );
  }
}

// API strategy - Network first with timeout and bounded cache.
async function apiStrategy(request) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('API timeout')), 5000)
  );

  try {
    const response = await Promise.race([fetch(request), timeout]);
    if (isCacheableApiResponse(response)) {
      const cache = await caches.open(API_CACHE);
      await cache.put(request, response.clone());
      await trimCache(API_CACHE, MAX_API_ENTRIES);
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
          'Content-Type': 'application/json',
        }),
      }
    );
  }
}

// Image strategy - stale-while-revalidate.
async function imageStrategy(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    fetch(request)
      .then(async (response) => {
        if (isCacheableResponse(response)) {
          await cache.put(request, response.clone());
          await trimCache(IMAGE_CACHE, MAX_IMAGE_ENTRIES);
        }
      })
      .catch(() => null);

    return cached;
  }

  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      await cache.put(request, response.clone());
      await trimCache(IMAGE_CACHE, MAX_IMAGE_ENTRIES);
    }
    return response;
  } catch (error) {
    console.log('[SW] Image fetch failed:', request.url);
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#f0f0f0" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="#999">Offline</text></svg>',
      {
        headers: { 'Content-Type': 'image/svg+xml' },
      }
    );
  }
}

// Check if request is for an image
function isImageRequest(request, url) {
  const accept = request.headers.get('accept') || '';
  return request.destination === 'image' ||
    accept.includes('image/') ||
    url.pathname.startsWith('/_next/image') ||
    /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname);
}

function isStaticAssetRequest(url) {
  return url.pathname.startsWith('/_next/static/') ||
    /\.(js|css|woff2?|ttf|eot)$/i.test(url.pathname);
}

function isServiceWorkerInfrastructure(url) {
  return url.pathname === '/sw.js' ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/pwa-host-gate.js' ||
    url.pathname === '/register-sw.js';
}

function shouldCacheRuntimeRequest(url) {
  return !(
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/checkout') ||
    url.pathname.startsWith('/cart') ||
    url.pathname.startsWith('/order') ||
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/register') ||
    url.pathname.startsWith('/profile') ||
    url.pathname.startsWith('/account') ||
    url.pathname.startsWith('/preorder') ||
    url.pathname.startsWith('/vendor')
  );
}

function isCacheableResponse(response) {
  if (!response || !response.ok) {
    return false;
  }

  const cacheControl = response.headers.get('Cache-Control') || '';
  if (cacheControl.includes('no-store')) {
    return false;
  }

  return true;
}

function isCacheableApiResponse(response) {
  if (!isCacheableResponse(response)) {
    return false;
  }

  const contentType = response.headers.get('Content-Type') || '';
  return contentType.includes('application/json');
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (isCacheableResponse(response)) {
        await cache.put(request, response.clone());
        await trimCache(cacheName, maxEntries);
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) {
    return networkResponse;
  }

  return new Response('Offline - Asset unavailable', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: new Headers({ 'Content-Type': 'text/plain' }),
  });
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length <= maxEntries) {
    return;
  }

  const deletes = keys.slice(0, keys.length - maxEntries).map((request) => cache.delete(request));
  await Promise.all(deletes);
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
      data: data.data || {},
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
          data: event.notification.data,
        });
      } else {
        clients.openWindow(event.notification.data.url || '/');
      }
    })
  );
});
