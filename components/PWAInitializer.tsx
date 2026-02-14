'use client';

import { useEffect } from 'react';
import { initializePWA, isAppInstalled, isPersistentStorageGranted, requestPersistentStorage } from '@/lib/pwa';

export function PWAInitializer() {
  useEffect(() => {
    const init = async () => {
      try {
        // Initialize PWA
        await initializePWA({
          enableAutoUpdate: true,
          updateCheckInterval: 3600000, // 1 hour
          enableNotifications: true
        });

        // Check if persistent storage is available
        const isPersistent = await isPersistentStorageGranted();
        if (!isPersistent) {
          try {
            await requestPersistentStorage();
          } catch (err) {
            console.log('Persistent storage request denied');
          }
        }

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
      window.addEventListener('load', init, { once: true });
      // Also try immediately in case load already fired
      if (document.readyState === 'complete') {
        init();
      }
    }

    return () => {
      window.removeEventListener('load', init);
    };
  }, []);

  return null;
}
