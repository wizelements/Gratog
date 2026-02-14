'use client';

import { useEffect } from 'react';
import { initializePWA, isAppInstalled, isPersistentStorageGranted, requestPersistentStorage } from '@/lib/pwa';

export function PWAInitializer() {
  useEffect(() => {
    const init = async () => {
      // Initialize PWA
      initializePWA({
        enableAutoUpdate: true,
        updateCheckInterval: 3600000, // 1 hour
        enableNotifications: true
      });

      // Check if persistent storage is available
      const isPersistent = await isPersistentStorageGranted();
      if (!isPersistent) {
        await requestPersistentStorage();
      }

      // Log app status
      console.log('PWA Status:', {
        installed: isAppInstalled(),
        persistent: await isPersistentStorageGranted(),
        online: navigator.onLine
      });
    };

    init();
  }, []);

  return null;
}
