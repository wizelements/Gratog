/**
 * i18n Utilities
 * 
 * Usage:
 * 
 * Server-side / Static:
 *   import { getTranslation } from '@/lib/i18n';
 *   const t = getTranslation('es', 'nav.home'); // "Inicio"
 * 
 * Client-side (in components):
 *   import { useTranslation } from '@/lib/i18n';
 *   const { t, locale } = useTranslation();
 *   <button>{t('common.save')}</button>
 * 
 * With interpolation:
 *   t('errors.minLength', { min: 8 }) // "Must be at least 8 characters"
 */

'use client';

import { useContext, useCallback } from 'react';
import { LocaleContext } from '@/contexts/LocaleContext';
import { DEFAULT_LOCALE, isValidLocale } from './config';

import en from './translations/en.json';
import es from './translations/es.json';
import fr from './translations/fr.json';

const translations = { en, es, fr };

/**
 * Get a nested value from an object using dot notation
 * @param {object} obj - The object to search
 * @param {string} path - Dot-notation path (e.g., "nav.home")
 * @returns {string|undefined} The value at the path
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Interpolate variables in a translation string
 * @param {string} str - The string with placeholders like {min}
 * @param {object} vars - Object with variable values
 * @returns {string} Interpolated string
 */
function interpolate(str, vars = {}) {
  if (!vars || typeof str !== 'string') return str;
  return str.replace(/\{(\w+)\}/g, (match, key) => {
    return vars[key] !== undefined ? vars[key] : match;
  });
}

/**
 * Get a translation for a specific locale and key
 * Falls back to English if the key is not found in the requested locale
 * 
 * @param {string} locale - The locale code (e.g., 'en', 'es', 'fr')
 * @param {string} key - Dot-notation key (e.g., 'nav.home')
 * @param {object} vars - Optional variables for interpolation
 * @returns {string} The translated string or the key if not found
 */
export function getTranslation(locale, key, vars = {}) {
  const safeLocale = isValidLocale(locale) ? locale : DEFAULT_LOCALE;
  
  let value = getNestedValue(translations[safeLocale], key);
  
  if (value === undefined && safeLocale !== DEFAULT_LOCALE) {
    value = getNestedValue(translations[DEFAULT_LOCALE], key);
  }
  
  if (value === undefined) {
    console.warn(`[i18n] Missing translation: ${key}`);
    return key;
  }
  
  return interpolate(value, vars);
}

/**
 * React hook for translations in client components
 * Must be used within a LocaleProvider
 * 
 * @returns {{ t: Function, locale: string }}
 */
export function useTranslation() {
  const context = useContext(LocaleContext);
  const locale = context?.locale ?? DEFAULT_LOCALE;
  
  const t = useCallback(
    (key, vars) => getTranslation(locale, key, vars),
    [locale]
  );
  
  if (!context) {
    console.warn('[i18n] useTranslation must be used within a LocaleProvider');
  }
  
  return { t, locale };
}

/**
 * Get all translations for a locale (useful for passing to client components)
 * @param {string} locale - The locale code
 * @returns {object} All translations for the locale
 */
export function getAllTranslations(locale) {
  const safeLocale = isValidLocale(locale) ? locale : DEFAULT_LOCALE;
  return translations[safeLocale] || translations[DEFAULT_LOCALE];
}

export { SUPPORTED_LOCALES, DEFAULT_LOCALE, LOCALE_NAMES, LOCALE_FLAGS } from './config';
