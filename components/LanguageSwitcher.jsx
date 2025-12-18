/**
 * Language Switcher Component
 * 
 * A compact dropdown for switching between supported languages.
 * 
 * Usage:
 *   import LanguageSwitcher from '@/components/LanguageSwitcher';
 *   
 *   // In your header:
 *   <header>
 *     <nav>...</nav>
 *     <LanguageSwitcher />
 *   </header>
 *   
 *   // With custom className:
 *   <LanguageSwitcher className="ml-4" />
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  SUPPORTED_LOCALES,
  LOCALE_NAMES,
  LOCALE_FLAGS,
} from '@/lib/i18n/config';

export default function LanguageSwitcher({ className = '' }) {
  const { locale, setLocale, isLoaded } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSelect = (newLocale) => {
    setLocale(newLocale);
    setIsOpen(false);
  };

  if (!isLoaded) {
    return (
      <div className={`w-20 h-9 bg-gray-100 rounded animate-pulse ${className}`} />
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select language"
      >
        <span className="text-base" role="img" aria-hidden="true">
          {LOCALE_FLAGS[locale]}
        </span>
        <span className="hidden sm:inline">{LOCALE_NAMES[locale]}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <ul
          className="absolute right-0 z-50 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg py-1 focus:outline-none"
          role="listbox"
          aria-label="Available languages"
        >
          {SUPPORTED_LOCALES.map((localeOption) => (
            <li key={localeOption}>
              <button
                type="button"
                onClick={() => handleSelect(localeOption)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 transition-colors ${
                  locale === localeOption
                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                    : 'text-gray-700'
                }`}
                role="option"
                aria-selected={locale === localeOption}
              >
                <span className="text-base" role="img" aria-hidden="true">
                  {LOCALE_FLAGS[localeOption]}
                </span>
                <span>{LOCALE_NAMES[localeOption]}</span>
                {locale === localeOption && (
                  <svg
                    className="w-4 h-4 ml-auto text-emerald-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
