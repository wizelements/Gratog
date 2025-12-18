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
 * Track filter applied
 * @param {string} filterType - Type of filter (category, price, benefit, etc.)
 * @param {string} filterValue - Value selected
 * @param {number} resultsCount - Results after filtering
 */
export function trackFilterApplied(filterType, filterValue, resultsCount = null) {
  safeGtag('filter_applied', {
    filter_type: filterType,
    filter_value: filterValue,
    ...(resultsCount !== null && { results_count: resultsCount }),
  });
}

/**
 * Track sort applied
 * @param {string} sortBy - Sort field
 * @param {string} sortOrder - Sort direction (asc/desc)
 */
export function trackSortApplied(sortBy, sortOrder = 'asc') {
  safeGtag('sort_applied', {
    sort_by: sortBy,
    sort_order: sortOrder,
  });
}

/**
 * Track social share
 * @param {string} platform - Social platform (facebook, twitter, etc.)
 * @param {string} contentType - Type of content shared (product, page, etc.)
 * @param {string} itemId - ID of shared item
 */
export function trackSocialShare(platform, contentType, itemId = null) {
  safeGtag('share', {
    method: platform,
    content_type: contentType,
    ...(itemId && { item_id: itemId }),
  });
}

/**
 * Track coupon applied
 * @param {string} couponCode - Coupon code used
 * @param {boolean} success - Whether coupon was valid
 * @param {number} discountValue - Discount amount in cents (if successful)
 */
export function trackCouponApplied(couponCode, success, discountValue = null) {
  safeGtag('coupon_applied', {
    coupon_code: couponCode,
    success: success,
    ...(discountValue && { discount_value: discountValue / 100 }),
  });
}

/**
 * Track login
 * @param {string} method - Login method (email, google, etc.)
 */
export function trackLogin(method = 'email') {
  safeGtag('login', {
    method: method,
  });
}

/**
 * Track signup
 * @param {string} method - Signup method
 */
export function trackSignup(method = 'email') {
  safeGtag('sign_up', {
    method: method,
  });
}

/**
 * Track page scroll depth
 * @param {number} percentage - Scroll depth percentage (25, 50, 75, 100)
 * @param {string} pagePath - Current page path
 */
export function trackScrollDepth(percentage, pagePath) {
  safeGtag('scroll_depth', {
    percent_scrolled: percentage,
    page_path: pagePath,
  });
}

/**
 * Track video engagement
 * @param {string} videoTitle - Title of video
 * @param {string} action - Video action (play, pause, complete, progress)
 * @param {number} progress - Progress percentage (for progress events)
 */
export function trackVideoEngagement(videoTitle, action, progress = null) {
  safeGtag('video_engagement', {
    video_title: videoTitle,
    video_action: action,
    ...(progress !== null && { video_progress: progress }),
  });
}

/**
 * Track contact form submission
 * @param {string} formType - Type of form (contact, support, wholesale)
 * @param {string} subject - Subject/reason for contact
 */
export function trackContactFormSubmit(formType, subject = null) {
  safeGtag('contact_form_submit', {
    form_type: formType,
    ...(subject && { contact_subject: subject }),
  });
}

/**
 * Track reward/loyalty events
 * @param {string} eventType - Type of reward event (earned, redeemed, unlocked)
 * @param {string} rewardName - Name of reward
 * @param {number} pointsValue - Points involved
 */
export function trackRewardEvent(eventType, rewardName, pointsValue = null) {
  safeGtag('reward_event', {
    reward_event_type: eventType,
    reward_name: rewardName,
    ...(pointsValue && { points_value: pointsValue }),
  });
}

/**
 * Track exit intent popup
 * @param {string} action - User action (shown, closed, converted)
 * @param {string} offerId - Offer shown in popup
 */
export function trackExitIntent(action, offerId = null) {
  safeGtag('exit_intent', {
    exit_intent_action: action,
    ...(offerId && { offer_id: offerId }),
  });
}

const analyticsEvents = {
  trackNewsletterSignup,
  trackQuizCompletion,
  trackQuizStart,
  trackQuizAbandonment,
  trackWishlistAdd,
  trackWishlistRemove,
  trackSearchPerformed,
  trackFilterApplied,
  trackSortApplied,
  trackSocialShare,
  trackCouponApplied,
  trackLogin,
  trackSignup,
  trackScrollDepth,
  trackVideoEngagement,
  trackContactFormSubmit,
  trackRewardEvent,
  trackExitIntent,
};

export default analyticsEvents;
