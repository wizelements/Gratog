const DEBUG = process.env.DEBUG === "true" || process.env.VERBOSE === "true";
const debug = (...args: unknown[]) => { if (DEBUG) console.log('[ANALYTICS]', ...args); };

// Analytics helper for GA4 and Mixpanel

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    mixpanel?: {
      track?: (event: string, props?: Record<string, any>) => void;
    };
    posthog?: any;
  }
}

export class AnalyticsSystem {
  static initPostHog() {
    if (typeof window !== 'undefined' && !window.posthog) {
      // Dynamic import for client-side only - graceful fallback if not available
      import('posthog-js').then(({ default: posthog }) => {
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || 'mock_key', {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
          person_profiles: 'identified_only'
        });
        window.posthog = posthog;
      }).catch(() => {
        debug('PostHog not available, using console logging only');
        window.posthog = { capture: () => {} }; // Mock for graceful fallback
      });
    }
  }

  static trackEvent(eventName: string, properties: Record<string, any> = {}) {
    // PostHog tracking (client-side only)
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture(eventName, properties);
    }
  }
}

export function track(event: string, props: Record<string, any> = {}) {
  try {
    // GA4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event, props);
    }
  } catch (e) {
    console.warn('[analytics] GA4 track error:', e);
  }

  try {
    // Mixpanel
    if (typeof window !== 'undefined' && window.mixpanel?.track) {
      window.mixpanel.track(event, props);
    }
  } catch (e) {
    console.warn('[analytics] Mixpanel track error:', e);
  }
}

export const Events = {
  FULFILLMENT_SELECTED: 'fulfillment_selected',
  DELIVERY_ZIP_VALID: 'delivery_zip_valid',
  DELIVERY_ZIP_INVALID: 'delivery_zip_invalid',
  DELIVERY_WINDOW_SELECTED: 'delivery_window_selected',
  FULFILLMENT_CONTINUE_BLOCKED: 'fulfillment_continue_blocked',
  PURCHASE: 'purchase',
  ADD_TO_CART: 'add_to_cart',
  VIEW_ITEM: 'view_item',
  BEGIN_CHECKOUT: 'begin_checkout'
};
