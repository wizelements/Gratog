/**
 * Custom GA4 Event Definitions
 * Non-e-commerce events for user engagement tracking
 * 
 * Required Environment Variable: NEXT_PUBLIC_GA_ID
 */

const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Safely call gtag with error handling
 */
function safeGtag(eventName, params = {}) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    try {
      window.gtag('event', eventName, params);
      if (DEBUG) {
        console.log('📊 GA4 Custom Event:', eventName, params);
      }
    } catch (error) {
      console.error('GA4 tracking error:', error);
    }
  } else if (DEBUG) {
    console.log('📊 GA4 Custom (mock):', eventName, params);
  }
}

/**
 * Track newsletter signup
 * @param {string} source - Where the signup occurred (footer, popup, checkout, etc.)
 * @param {string} email - Hashed or partial email for deduplication (optional)
 */
export function trackNewsletterSignup(source, email = null) {
  safeGtag('newsletter_signup', {
    signup_source: source,
    method: 'email',
    ...(email && { user_email_hash: email }),
  });
}

/**
 * Track quiz completion
 * @param {string} quizType - Type of quiz (product_finder, wellness, etc.)
 * @param {Object} results - Quiz results/recommendations
 * @param {number} completionTime - Time to complete in seconds
 */
export function trackQuizCompletion(quizType, results, completionTime = null) {
  safeGtag('quiz_completed', {
    quiz_type: quizType,
    recommendation_count: results?.length || 0,
    primary_goal: results?.goal || undefined,
    adventurous_level: results?.adventurous || undefined,
    ...(completionTime && { completion_time_seconds: completionTime }),
  });
}

/**
 * Track quiz start
 * @param {string} quizType - Type of quiz
 */
export function trackQuizStart(quizType) {
  safeGtag('quiz_started', {
    quiz_type: quizType,
  });
}

/**
 * Track quiz abandonment
 * @param {string} quizType - Type of quiz
 * @param {number} stepNumber - Step where user abandoned
 */
export function trackQuizAbandonment(quizType, stepNumber) {
  safeGtag('quiz_abandoned', {
    quiz_type: quizType,
    abandoned_at_step: stepNumber,
  });
}

/**
 * Track item added to wishlist
 * @param {Object} product - Product details
 */
export function trackWishlistAdd(product) {
  safeGtag('add_to_wishlist', {
    currency: 'USD',
    value: (product.price || 0) / 100,
    items: [{
      item_id: product.id || product.sku,
      item_name: product.name || product.title,
      item_brand: 'Taste of Gratitude',
      item_category: product.category || 'Sea Moss',
      price: (product.price || 0) / 100,
    }],
  });
}

/**
 * Track item removed from wishlist
 * @param {Object} product - Product details
 */
export function trackWishlistRemove(product) {
  safeGtag('remove_from_wishlist', {
    item_id: product.id || product.sku,
    item_name: product.name || product.title,
  });
}

/**
 * Track search performed
 * @param {string} searchTerm - Search query
 * @param {number} resultsCount - Number of results returned
 */
export function trackSearchPerformed(searchTerm, resultsCount = 0) {
  safeGtag('search', {
    search_term: searchTerm,
    results_count: resultsCount,
  });
}

/**
 * Track funnel events for passive revenue work.
 */
export function trackFunnelEvent(eventName, params = {}) {
  safeGtag(eventName, params);
}

export const FUNNEL_EVENTS = {
  WEEKLYMENU_VIEW: 'weeklymenu_view',
  WEEKLYMENU_PREORDER_CLICK: 'weeklymenu_preorder_click',
  WEEKLYMENU_LEAD_SUBMIT: 'weeklymenu_lead_submit',
  BUNDLE_SUGGESTION_VIEW: 'bundle_suggestion_view',
  BUNDLE_SUGGESTION_CLICK: 'bundle_suggestion_click',
  DELIVERY_TOGGLE: 'delivery_toggle',
  DELIVERY_QUOTE: 'delivery_quote',
  GRATITUDE_BOX_VIEW: 'gratitude_box_view',
  GRATITUDE_BOX_SUBMIT: 'gratitude_box_submit',
  WINBACK_SEND: 'winback_send',
  WEEKLY_WARM_SEND: 'weekly_warm_send',
};

/**
 * Track contact form completion
 */
export function trackContactCompleted({ name, email, phone, subject }) {
  safeGtag('contact_completed', {
    has_name: Boolean(name),
    has_email: Boolean(email),
    has_phone: Boolean(phone),
    subject: subject || 'general',
  });
}

/**
 * Track admin action
 */
export function trackAdminAction(action, details = {}) {
  safeGtag('admin_action', {
    action,
    ...details,
  });
}

/**
 * Track subscription interest
 */
export function trackSubscriptionInterest(plan, source = 'site', metadata = {}) {
  safeGtag('subscription_interest', {
    plan,
    source,
    ...metadata,
  });
}

/**
 * Track delivery option interest
 */
export function trackDeliveryInterest(zipcode, zone, feeCents, subtotalCents) {
  safeGtag('delivery_interest', {
    zipcode,
    zone_name: zone?.name || 'unknown',
    fee: feeCents ? feeCents / 100 : 0,
    subtotal: subtotalCents ? subtotalCents / 100 : 0,
  });
}
