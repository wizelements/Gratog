/**
 * i18n Configuration
 * 
 * Central configuration for internationalization settings.
 * To add a new locale:
 * 1. Add the locale code to SUPPORTED_LOCALES
 * 2. Add the display name to LOCALE_NAMES
 * 3. Create a translation file in /lib/i18n/translations/{locale}.json
 */

export const SUPPORTED_LOCALES = ['en', 'es', 'fr'];

export const DEFAULT_LOCALE = 'en';

export const LOCALE_NAMES = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
};

export const LOCALE_FLAGS = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
};

export function isValidLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale);
}

export function getLocaleName(locale) {
  return LOCALE_NAMES[locale] || LOCALE_NAMES[DEFAULT_LOCALE];
}

export function getLocaleFlag(locale) {
  return LOCALE_FLAGS[locale] || LOCALE_FLAGS[DEFAULT_LOCALE];
}
