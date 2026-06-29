/**
 * Site configuration utilities
 * Provides centralized access to site URLs and configuration
 */

// Get the site URL from environment or default
export const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://tasteofgratitude.shop');

// Get the API base URL
export const API_BASE_URL = `${SITE_URL}/api`;

// Check if running in production
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Check if running on Vercel
export const IS_VERCEL = !!process.env.VERCEL;

// Get environment
export const ENVIRONMENT = process.env.NODE_ENV || 'development';

// Feature flags
export const FEATURES = {
  subscriptions: process.env.FEATURE_SUBSCRIPTIONS_ENABLED === 'true',
  returns: process.env.FEATURE_RETURNS_ENABLED !== 'false',
  enhancedSearch: process.env.FEATURE_ENHANCED_SEARCH !== 'false',
  inventoryLocking: process.env.FEATURE_INVENTORY_LOCKING !== 'false',
  mobileAdmin: process.env.FEATURE_MOBILE_ADMIN !== 'false'
};

// Contact information
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'hello@tasteofgratitude.shop';
export const CONTACT_PHONE = process.env.CONTACT_PHONE || '';
export const CONTACT_PHONE_HREF = CONTACT_PHONE ? `tel:${CONTACT_PHONE.replace(/\D/g, '')}` : '';
export const CONTACT_PHONE_DISPLAY = CONTACT_PHONE || 'Contact Us';
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || CONTACT_EMAIL;
export const SUPPORT_HOURS_LABEL = process.env.SUPPORT_HOURS || 'Mon-Fri 9am-5pm EST';
export const PRIVACY_EMAIL = process.env.PRIVACY_EMAIL || SUPPORT_EMAIL;
export const MARKET_LOCATION_LABEL = process.env.MARKET_LOCATION || 'Atlanta, GA';
export const WHOLESALE_EMAIL = process.env.WHOLESALE_EMAIL || SUPPORT_EMAIL;
export const HAS_PUBLIC_PHONE = !!CONTACT_PHONE;

// Default export
export default {
  SITE_URL,
  API_BASE_URL,
  IS_PRODUCTION,
  IS_VERCEL,
  ENVIRONMENT,
  FEATURES
};
