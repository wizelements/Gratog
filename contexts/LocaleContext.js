/**
 * Locale Context
 * 
 * Provides locale state throughout the application.
 * 
 * Usage:
 *   // In your root layout or _app.js:
 *   import { LocaleProvider } from '@/contexts/LocaleContext';
 *   
 *   export default function RootLayout({ children }) {
 *     return (
 *       <LocaleProvider>
 *         {children}
 *       </LocaleProvider>
 *     );
 *   }
 * 
 *   // In any component:
 *   import { useLocale } from '@/contexts/LocaleContext';
 *   
 *   function MyComponent() {
 *     const { locale, setLocale } = useLocale();
 *     // ...
 *   }
 */

'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DEFAULT_LOCALE, isValidLocale } from '@/lib/i18n/config';

const LOCALE_STORAGE_KEY = 'preferred-locale';

export const LocaleContext = createContext(null);

export function LocaleProvider({ children, initialLocale }) {
  const [locale, setLocaleState] = useState(initialLocale || DEFAULT_LOCALE);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored && isValidLocale(stored)) {
        setLocaleState(stored);
      } else {
        const browserLocale = navigator.language?.split('-')[0];
        if (isValidLocale(browserLocale)) {
          setLocaleState(browserLocale);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  const setLocale = useCallback((newLocale) => {
    if (!isValidLocale(newLocale)) {
      console.warn(`[i18n] Invalid locale: ${newLocale}`);
      return;
    }
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
      document.documentElement.lang = newLocale;
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && isLoaded) {
      document.documentElement.lang = locale;
    }
  }, [locale, isLoaded]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, isLoaded }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
