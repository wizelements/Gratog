'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'exit-intent-shown';
const COOLDOWN_HOURS = 24;

export function useExitIntent() {
  const [showExitIntent, setShowExitIntent] = useState(false);
  const hasTriggeredRef = useRef(false);

  const isOnCooldown = useCallback(() => {
    if (typeof window === 'undefined') return true;
    
    const lastShown = localStorage.getItem(STORAGE_KEY);
    if (!lastShown) return false;
    
    const lastShownTime = parseInt(lastShown, 10);
    const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
    return Date.now() - lastShownTime < cooldownMs;
  }, []);

  const hasCartItems = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    try {
      const cart = localStorage.getItem('cart');
      if (!cart) return false;
      const items = JSON.parse(cart);
      return Array.isArray(items) && items.length > 0;
    } catch {
      return false;
    }
  }, []);

  const trigger = useCallback(() => {
    if (hasTriggeredRef.current) return;
    if (isOnCooldown()) return;
    if (!hasCartItems()) return;
    
    hasTriggeredRef.current = true;
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setShowExitIntent(true);
  }, [isOnCooldown, hasCartItems]);

  const dismiss = useCallback(() => {
    setShowExitIntent(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleMouseLeave = (e) => {
      if (e.clientY <= 0) {
        trigger();
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [trigger]);

  return { showExitIntent, dismiss };
}
