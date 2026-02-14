'use client';

import { useEffect, useState } from 'react';
import { isAppInstalled, isOnline } from '@/lib/pwa';

export function PWADiagnostics() {
  const [status, setStatus] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    const check = () => {
      const pwaStatus = {
        serviceWorkerSupported: 'serviceWorker' in navigator,
        serviceWorkerReady: navigator.serviceWorker?.controller ? 'active' : 'inactive',
        manifestLink: !!document.querySelector('link[rel="manifest"]'),
        themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
        mobileWebAppCapable: document.querySelector('meta[name="mobile-web-app-capable"]')?.getAttribute('content') === 'yes',
        appleTouchIcon: !!document.querySelector('link[rel="apple-touch-icon"]'),
        appInstalled: isAppInstalled(),
        online: isOnline(),
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        https: window.location.protocol === 'https:',
        localStorage: (() => {
          try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
          } catch (e) {
            return false;
          }
        })(),
        indexedDB: !!window.indexedDB,
        cacheAPI: !!('caches' in window),
        timestamp: new Date().toISOString()
      };

      setStatus(pwaStatus);
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.table(pwaStatus);
      }
    };

    // Check immediately and on visibility change
    check();
    document.addEventListener('visibilitychange', check);

    return () => {
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  if (!status) {
    return null;
  }

  // Only show in development or if explicitly enabled
  const showDiagnostics = process.env.NODE_ENV === 'development' || 
    new URLSearchParams(window.location.search).has('pwa-debug');

  if (!showDiagnostics) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-xs font-mono max-w-md max-h-96 overflow-y-auto">
      <h3 className="font-bold mb-2">PWA Status</h3>
      <div className="space-y-1 text-gray-600">
        {Object.entries(status).map(([key, value]) => (
          <div key={key} className="flex justify-between gap-2">
            <span>{key}:</span>
            <span className={value === true ? 'text-green-600 font-bold' : value === false ? 'text-red-600 font-bold' : ''}>
              {String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
