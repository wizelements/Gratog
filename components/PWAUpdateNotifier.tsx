'use client';

import { useEffect, useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { activateServiceWorkerUpdate } from '@/lib/pwa';

export function PWAUpdateNotifier() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    // Listen for update available event
    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
    };

    window.addEventListener('pwa:update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('pwa:update-available', handleUpdateAvailable);
    };
  }, []);

  const handleUpdate = async () => {
    setUpdating(true);

    try {
      const activated = await activateServiceWorkerUpdate();

      // Fallback for browsers that don't trigger controllerchange quickly.
      setTimeout(() => {
        window.location.reload();
      }, activated ? 1200 : 0);
    } catch {
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 bg-blue-50 border border-blue-200 rounded-lg shadow-lg p-4 sm:max-w-md mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <RefreshCw size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Update Available</h3>
            <p className="text-xs text-gray-600 mt-1">
              A new version of Taste of Gratitude is ready to install.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-blue-700 transition-colors"
              >
                {updating ? 'Updating...' : 'Update Now'}
              </button>
              <button
                onClick={handleDismiss}
                className="bg-white text-gray-700 px-3 py-1.5 rounded text-xs font-semibold hover:bg-gray-50 transition-colors border border-gray-200"
              >
                Later
              </button>
            </div>
          </div>
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
