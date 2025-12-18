'use client';

import { useMemo, useCallback } from 'react';
import {
  trackViewItem,
  trackViewItemList,
  trackAddToCart,
  trackRemoveFromCart,
  trackBeginCheckout,
  trackAddShippingInfo,
  trackAddPaymentInfo,
  trackPurchase,
  trackRefund,
  trackSelectItem,
  trackViewPromotion,
  trackSelectPromotion,
} from '@/lib/ga4-analytics';

import {
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
} from '@/lib/analytics-events';

/**
 * Analytics hook for easy component integration
 * Provides memoized tracking functions for GA4 e-commerce and custom events
 * 
 * @example
 * const { ecommerce, custom } = useAnalytics();
 * 
 * // Track product view
 * ecommerce.viewItem(product);
 * 
 * // Track add to cart
 * ecommerce.addToCart(product, 2);
 * 
 * // Track newsletter signup
 * custom.newsletterSignup('footer');
 */
export function useAnalytics() {
  // Memoized e-commerce tracking functions
  const ecommerce = useMemo(() => ({
    viewItem: trackViewItem,
    viewItemList: trackViewItemList,
    addToCart: trackAddToCart,
    removeFromCart: trackRemoveFromCart,
    beginCheckout: trackBeginCheckout,
    addShippingInfo: trackAddShippingInfo,
    addPaymentInfo: trackAddPaymentInfo,
    purchase: trackPurchase,
    refund: trackRefund,
    selectItem: trackSelectItem,
    viewPromotion: trackViewPromotion,
    selectPromotion: trackSelectPromotion,
  }), []);

  // Memoized custom event tracking functions
  const custom = useMemo(() => ({
    newsletterSignup: trackNewsletterSignup,
    quizCompletion: trackQuizCompletion,
    quizStart: trackQuizStart,
    quizAbandonment: trackQuizAbandonment,
    wishlistAdd: trackWishlistAdd,
    wishlistRemove: trackWishlistRemove,
    search: trackSearchPerformed,
    filterApplied: trackFilterApplied,
    sortApplied: trackSortApplied,
    socialShare: trackSocialShare,
    couponApplied: trackCouponApplied,
    login: trackLogin,
    signup: trackSignup,
    scrollDepth: trackScrollDepth,
    videoEngagement: trackVideoEngagement,
    contactForm: trackContactFormSubmit,
    rewardEvent: trackRewardEvent,
    exitIntent: trackExitIntent,
  }), []);

  // Convenience method for tracking page views manually (for SPAs)
  const trackPageView = useCallback((path, title) => {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
        page_path: path,
        page_title: title,
      });
    }
  }, []);

  // Track custom event with arbitrary parameters
  const trackEvent = useCallback((eventName, params = {}) => {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
  }, []);

  return useMemo(() => ({
    ecommerce,
    custom,
    trackPageView,
    trackEvent,
  }), [ecommerce, custom, trackPageView, trackEvent]);
}

export default useAnalytics;
