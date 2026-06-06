'use client';

import { useState, useEffect } from 'react';

const CONSENT_KEY = 'tog_cookie_consent';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Check if user has already consented
    try {
      const consent = localStorage.getItem(CONSENT_KEY);
      if (!consent) {
        // Show banner after a short delay for better UX
        const timer = setTimeout(() => setShowBanner(true), 1500);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage unavailable
    }
    return undefined;
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted');
    } catch {
      // localStorage unavailable
    }
    setShowBanner(false);
  };

  const handleDecline = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'declined');
    } catch {
      // localStorage unavailable
    }
    setShowBanner(false);
  };

  if (!isMounted || !showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9998] sm:left-auto sm:max-w-md">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🍪</span>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Cookie preferences
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              We use essential cookies for cart and checkout, plus optional analytics to improve the store.
              Read our <a href="/privacy#cookies" className="font-medium text-emerald-700 hover:underline">cookie policy</a>.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={handleDecline}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md hover:shadow-lg hover:from-emerald-600 hover:to-teal-700 transition-all touch-manipulation flex items-center gap-2"
            >
              <span>Accept</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
