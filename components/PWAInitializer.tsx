'use client';

import { useEffect } from 'react';
import { initializePWA, isAppInstalled, isPersistentStorageGranted } from '@/lib/pwa';

export function PWAInitializer() {
  useEffect(() => {
    let started = false;
    const init = async () => {
      if (started) return;
      started = true;
      try {
        // Initialize PWA
        await initializePWA({
          enableAutoUpdate: true,
          updateCheckInterval: 60000, // 1 minute — catch deploys fast
          enableNotifications: false
        });

        // Persistent storage and push permissions belong behind user intent,
        // never an automatic prompt on every first visit.

        // Log app status
        const status = {
          installed: isAppInstalled(),
          persistent: await isPersistentStorageGranted(),
          online: navigator.onLine,
          swSupported: 'serviceWorker' in navigator,
          timestamp: new Date().toISOString()
        };
        
        console.log('🚀 PWA Ready:', status);
        
        // Store status in session storage for debugging
        sessionStorage.setItem('pwa-status', JSON.stringify(status));
      } catch (error) {
        console.error('❌ PWA initialization error:', error);
      }
    };

    // Defer initialization to next frame
    if (typeof window !== 'undefined') {
      if (document.readyState === 'complete') {
        void init();
      } else {
        window.addEventListener('load', init, { once: true });
      }
    }

    return () => {
      window.removeEventListener('load', init);
    };
  }, []);

  return null;
}
