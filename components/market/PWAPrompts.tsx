'use client';

import React, { useEffect, useState } from 'react';
import { X, Download, Share2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function PWAPrompts() {
  const [showInstall, setShowInstall] = useState(false);
  const [showPush, setShowPush] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show after 10 seconds or on second visit
      const visits = parseInt(localStorage.getItem('gratog_visits') || '0');
      if (visits >= 1) {
        setTimeout(() => setShowInstall(true), 5000);
      }
      localStorage.setItem('gratog_visits', (visits + 1).toString());
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if push notifications are supported and not granted
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(() => setShowPush(true), 15000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowInstall(false);
      setDeferredPrompt(null);
    }
  };

  const requestPushPermission = async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setShowPush(false);
      // TODO: Register service worker for push
    }
  };

  if (!showInstall && !showPush) return null;

  return (
    <>
      {/* Install Prompt */}
      {showInstall && (
        <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
          <Card className="p-4 shadow-lg border-emerald-200 bg-emerald-50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Download className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Add to Home Screen</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Install Taste of Gratitude for faster ordering and offline menu access.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleInstall}>
                    Install
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowInstall(false)}>
                    Not now
                  </Button>
                </div>
              </div>
              <button 
                onClick={() => setShowInstall(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Push Notification Prompt */}
      {showPush && (
        <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
          <Card className="p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Order Notifications</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Get notified when your order is ready for pickup.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={requestPushPermission}>
                    Enable
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowPush(false)}>
                    No thanks
                  </Button>
                </div>
              </div>
              <button 
                onClick={() => setShowPush(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
