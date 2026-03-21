/**
 * PWA Registration and Management Utilities
 */

export interface PWAConfig {
  enableAutoUpdate?: boolean;
  updateCheckInterval?: number;
  enableNotifications?: boolean;
}

let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
let updateCheckTimer: ReturnType<typeof setInterval> | null = null;
let hasServiceWorkerMessageListener = false;
let hasControllerChangeListener = false;
const SERVICE_WORKER_VERSION = '20260321-1';
const SERVICE_WORKER_URL = `/sw.js?v=${SERVICE_WORKER_VERSION}`;

/**
 * Register service worker and enable PWA features
 */
export async function initializePWA(config: PWAConfig = {}): Promise<ServiceWorkerRegistration | null> {
  const {
    enableAutoUpdate = true,
    updateCheckInterval = 60000, // 1 minute — catch deploys fast
    enableNotifications = true
  } = config;

  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    console.warn('⚠️ Service Workers not supported in this browser');
    return null;
  }

  // Check if HTTPS (required for SW, except localhost)
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isLocalhost && window.location.protocol !== 'https:') {
    console.warn('⚠️ Service Workers require HTTPS');
    return null;
  }

  if (serviceWorkerRegistration) {
    return serviceWorkerRegistration;
  }

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
      scope: '/',
      updateViaCache: 'none'
    });

    serviceWorkerRegistration = registration;
    console.log('✅ Service Worker registered successfully');

    // Check for updates periodically
    if (enableAutoUpdate) {
      if (updateCheckTimer) {
        clearInterval(updateCheckTimer);
      }
      updateCheckTimer = setInterval(() => {
        registration.update().catch(err => {
          console.log('Update check failed:', err);
        });
      }, updateCheckInterval);
    }

    // Auto-activate waiting worker immediately
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // Listen for updates — auto-activate new workers
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Auto-activate: skip waiting immediately
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      }
    });

    if (!hasControllerChangeListener) {
      hasControllerChangeListener = true;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service worker controller changed');
      });
    }

    // Request notification permission if enabled
    if (enableNotifications && 'Notification' in window && Notification.permission === 'default') {
      requestNotificationPermission();
    }

    // Set up message listener for SW
    if (!hasServiceWorkerMessageListener) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
      hasServiceWorkerMessageListener = true;
    }

    return registration;
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister service worker
 */
export async function unregisterSW() {
  if (serviceWorkerRegistration) {
    try {
      await serviceWorkerRegistration.unregister();
      console.log('Service Worker unregistered');
      serviceWorkerRegistration = null;
      if (updateCheckTimer) {
        clearInterval(updateCheckTimer);
        updateCheckTimer = null;
      }
    } catch (error) {
      console.error('Failed to unregister Service Worker:', error);
    }
  }
}

/**
 * Ask a waiting service worker to activate immediately.
 */
export async function activateServiceWorkerUpdate(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  const registration = serviceWorkerRegistration || await navigator.serviceWorker.getRegistration('/');
  const waitingWorker = registration?.waiting;

  if (!waitingWorker) {
    return false;
  }

  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  return true;
}

/**
 * Check if PWA is installed
 */
export function isAppInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-ignore - Navigator.standalone is iOS specific
    navigator.standalone === true;
}

/**
 * Get install prompt
 */
export function getInstallPrompt() {
  return (window as any).deferredPrompt;
}

/**
 * Trigger install prompt if available
 */
export async function promptInstall() {
  const deferredPrompt = getInstallPrompt();
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response: ${outcome}`);
    (window as any).deferredPrompt = null;
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return 'denied';
  }

  if (Notification.permission !== 'granted') {
    return Notification.requestPermission();
  }

  return 'granted';
}

/**
 * Send notification
 */
export async function sendNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    console.log('Notification permission not granted');
    return;
  }

  if (serviceWorkerRegistration) {
    try {
      await serviceWorkerRegistration.showNotification(title, options);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(publicKey: string): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported');
    return null;
  }

  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
    });
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    return null;
  }
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Check if device is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Handle messages from service worker
 */
function handleSWMessage(event: MessageEvent) {
  if (!event.data || typeof event.data !== 'object') {
    return;
  }

  const { type, data } = event.data;

  switch (type) {
    case 'NOTIFICATION_CLICK':
      handleNotificationClick(data);
      break;
    case 'SW_ACTIVATED':
      console.log('[PWA] New SW version activated:', data?.version || 'unknown');
      // Reload handled by inline script in layout.js head — no action needed here
      break;
    case 'UPDATE_AVAILABLE':
      notifyUpdateAvailable();
      break;
    default:
      console.log('Unknown message from SW:', type);
  }
}

/**
 * Notify user about update
 */
function notifyUpdateAvailable() {
  // Dispatch custom event
  window.dispatchEvent(new CustomEvent('pwa:update-available', {
    detail: { message: 'A new version of Taste of Gratitude is available!' }
  }));

  // Or send notification
  sendNotification('Update Available', {
    body: 'A new version of Taste of Gratitude is ready. Reload to update.',
    badge: '/icons/badge-72x72.png',
    tag: 'update-notification'
  });
}

/**
 * Handle notification click
 */
function handleNotificationClick(data: Record<string, any>) {
  const { url } = data;
  if (url) {
    window.location.href = url;
  }
}

/**
 * Request persistent storage
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage || !navigator.storage.persist) {
    return false;
  }

  try {
    const persistent = await navigator.storage.persist();
    console.log(`Persistent storage granted: ${persistent}`);
    return persistent;
  } catch (error) {
    console.error('Failed to request persistent storage:', error);
    return false;
  }
}

/**
 * Check if storage is persistent
 */
export async function isPersistentStorageGranted(): Promise<boolean> {
  if (!navigator.storage || !navigator.storage.persisted) {
    return false;
  }

  return navigator.storage.persisted();
}

/**
 * Queue order for background sync
 */
export async function queueOrderForSync(order: Record<string, any>): Promise<boolean> {
  try {
    const db = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('GratogDB', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('pendingOrders')) {
          db.createObjectStore('pendingOrders', { keyPath: 'id' });
        }
      };
    });

    const database = await db;
    const transaction = database.transaction('pendingOrders', 'readwrite');
    const store = transaction.objectStore('pendingOrders');
    store.add(order);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Failed to queue order:', error);
    return false;
  }
}
