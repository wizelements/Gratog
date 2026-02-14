'use client';

import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import { promptInstall, getInstallPrompt } from '@/lib/pwa';

export function PWAPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check for iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Hide if already installed
    const handleAppInstalled = () => {
      (window as any).deferredPrompt = null;
      setIsVisible(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    await promptInstall();
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 sm:max-w-sm mx-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm">Install App</h3>
            <p className="text-xs text-gray-600 mt-1">
              Tap the Share button, then select "Add to Home Screen" to install Taste of Gratitude.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-lg p-4 sm:max-w-sm mx-auto text-white">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <Download size={24} className="flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-sm">Install App</h3>
            <p className="text-xs opacity-90">Quick access from your home screen</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="bg-white text-purple-600 px-3 py-1.5 rounded font-semibold text-xs hover:bg-gray-100 transition-colors"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
