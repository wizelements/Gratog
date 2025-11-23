// Analytics system for Taste of Gratitude with PostHog integration

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
        console.log('PostHog not available, using console logging only');
        window.posthog = { capture: () => {} }; // Mock for graceful fallback
      });
    }
  }
  
  static trackEvent(eventName, properties = {}) {
    // Console logging for development
    console.log('🔍 Analytics Event:', eventName, properties);
    
    // PostHog tracking (client-side only)
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture(eventName, properties);
    }
    
    // Server-side logging for backup
    if (typeof window === 'undefined') {
      console.log('📊 Server Analytics:', eventName, properties);
    }
  }
  
  // Hero Section Events
  static trackHeroCTA(cta) {
    this.trackEvent('hero_cta_click', { cta });
  }
  
  static trackMissionViewed() {
    this.trackEvent('mission_viewed');
  }
  
  // Market Events
  static trackMarketDirections(market) {
    this.trackEvent('market_directions_click', { market });
  }
  
  static trackAddToCalendar(market, start) {
    this.trackEvent('add_to_calendar_click', { market, start });
  }
  
  // Quiz Events
  static trackQuizStarted() {
    this.trackEvent('quiz_started');
  }
  
  static trackQuizCompleted(goal, adventurous, recommendations) {
    this.trackEvent('quiz_completed', { 
      goal, 
      adventurous, 
      recommendation_count: recommendations.length 
    });
  }
  
  static trackQuizSkipped() {
    this.trackEvent('quiz_skip_clicked');
  }
  
  static trackQuizAnswered(questionNumber, answer) {
    this.trackEvent('quiz_answer_selected', { questionNumber, answer });
  }
  
  // Product Events
  static trackPDPView(sku) {
    this.trackEvent('pdp_view', { sku });
  }
  
  static trackQuickViewOpened(sku, productName) {
    this.trackEvent('quick_view_opened', { sku, productName });
  }
  
  static trackQuickViewClosed(sku, timeSpent) {
    this.trackEvent('quick_view_closed', { sku, timeSpent });
  }
  
  static trackVariantSelected(sku, variantName, price) {
    this.trackEvent('variant_selected', { sku, variantName, price });
  }
  
  static trackBundleSelected(sku) {
    this.trackEvent('bundle_selected', { sku });
  }
  
  static trackTrialSizeAdded(baseSku, trialSku) {
    this.trackEvent('trial_size_added', { baseSku, trialSku });
  }
  
  // Cart Events
  static trackAddToCart(sku, productName, price, quantity, source) {
    this.trackEvent('add_to_cart', { sku, productName, price, quantity, source });
  }
  
  static trackRemoveFromCart(sku, productName) {
    this.trackEvent('remove_from_cart', { sku, productName });
  }
  
  static trackCartOpened() {
    this.trackEvent('cart_opened');
  }
  
  static trackCartClosed(timeSpent) {
    this.trackEvent('cart_closed', { timeSpent });
  }
  
  // Checkout Events
  static trackCheckoutStarted(provider, items) {
    this.trackEvent('checkout_started', { 
      provider,
      item_count: items.length,
      total_items: items.reduce((sum, item) => sum + item.quantity, 0)
    });
  }
  
  static trackPurchaseCompleted(totalCents, items) {
    this.trackEvent('purchase_completed', { 
      total_cents: totalCents,
      items: items.map(item => ({ sku: item.sku, qty: item.quantity }))
    });
  }
  
  // Rewards Events
  static trackPassportStampAdded(market, stampCount) {
    this.trackEvent('passport_stamp_added', { market, stampCount });
  }
  
  static trackRewardUnlocked(rewardType, rewardTitle) {
    this.trackEvent('reward_unlocked', { rewardType, rewardTitle });
  }
  
  // UGC Events
  static trackUGCSubmitted(challenge, platform) {
    this.trackEvent('ugc_submitted', { challenge, platform });
  }
  
  // Engagement Events
  static trackWhySeaMossAccordionOpen(panel) {
    this.trackEvent('why_sea_moss_accordion_open', { panel });
  }
  
  static trackEmailSignup(source) {
    this.trackEvent('email_signup', { source });
  }
  
  static trackSocialShare(platform, content) {
    this.trackEvent('social_share', { platform, content });
  }
  
  // PHASE 6 NEW EVENTS
  static trackCatalogFilterUsed(filterType, filterValue) {
    this.trackEvent('catalog_filter_used', { filterType, filterValue });
  }
  
  static trackQuizProgressAbandoned(questionNumber) {
    this.trackEvent('quiz_abandoned', { questionNumber });
  }
  
  static trackSaveAllPicks(recommendationCount) {
    this.trackEvent('save_all_picks_clicked', { recommendationCount });
  }
}

export default AnalyticsSystem;