'use client';

import { useState, useEffect } from 'react';
import { useMusic } from '@/contexts/MusicContext';

const CONSENT_KEY = 'tog_cookie_consent';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const music = useMusic();

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
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted');
    } catch {
      // localStorage unavailable
    }
    setShowBanner(false);

    // Auto-start music on cookie acceptance (user gesture preserved)
    music.setEnabled(true);
    void music.play('that_gratitude_intro', 2000).catch((error) => {
      console.debug('[CookieConsent] Music autoplay blocked:', error.message);
    });
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
    <div className="fixed bottom-0 inset-x-0 z-[9998] p-4 sm:p-6">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🍪</span>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Welcome to Taste of Gratitude
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              We use cookies to enhance your experience with personalized settings and 
              <span className="text-emerald-600 dark:text-emerald-400 font-medium"> soothing background music </span>
              designed to support your wellness journey. Accept to enjoy the full experience.
            </p>
          </div>
          
          <div className="flex gap-3 sm:flex-shrink-0">
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
              <span className="text-base">🎵</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
