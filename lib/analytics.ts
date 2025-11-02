// Analytics helper for GA4 and Mixpanel

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    mixpanel?: {
      track?: (event: string, props?: Record<string, any>) => void;
    };
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
