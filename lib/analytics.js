// Production Analytics and Monitoring
import { connectToDatabase } from './db-admin';

// Google Analytics 4 Integration
export const initGA4 = () => {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GA_ID) {
    // Load Google Analytics
    window.gtag = window.gtag || function() {
      (window.gtag.q = window.gtag.q || []).push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
      page_title: document.title,
      page_location: window.location.href,
    });
  }
};

// Track page views
export const trackPageView = (path) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
      page_path: path,
    });
  }
};

// Track events
export const trackEvent = (action, category = 'general', label = '', value = 0) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
  
  // Also log to our internal analytics
  logInternalEvent(action, category, label, value);
};

// E-commerce tracking
export const trackPurchase = (transactionData) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: transactionData.orderId,
      value: transactionData.total / 100, // Convert from cents
      currency: 'USD',
      items: transactionData.items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        category: item.category || 'sea-moss',
        quantity: item.quantity,
        price: item.price / 100
      }))
    });
  }
  
  // Log to internal analytics
  logInternalEvent('purchase', 'ecommerce', transactionData.orderId, transactionData.total);
};

// Track coupon usage
export const trackCouponUsage = (couponData) => {
  trackEvent('coupon_used', 'engagement', couponData.code, couponData.discountAmount);
  
  // Log coupon analytics
  logInternalEvent('coupon_used', 'coupons', couponData.type, couponData.discountAmount);
};

// Track spin wheel interactions
export const trackSpinWheel = (result) => {
  trackEvent('spin_wheel', 'engagement', result.label, result.value);
  
  logInternalEvent('spin_wheel', 'gamification', result.label, result.value);
};

// Internal analytics logging
const logInternalEvent = async (action, category, label, value) => {
  if (typeof window === 'undefined') return; // Server-side, skip
  
  try {
    const analyticsData = {
      event: action,
      category,
      label,
      value,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
      sessionId: getSessionId()
    };
    
    // Send to internal analytics API
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(analyticsData)
    });
  } catch (error) {
    console.warn('Failed to log internal analytics:', error);
  }
};

// Session management
const getSessionId = () => {
  if (typeof window === 'undefined') return null;
  
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

// Performance monitoring
export class PerformanceTracker {
  static trackPageLoad() {
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        const metrics = {
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
        };
        
        // Track performance metrics
        trackEvent('page_load_time', 'performance', 'load_complete', Math.round(metrics.loadTime));
        
        // Log to internal analytics
        logInternalEvent('page_performance', 'performance', window.location.pathname, metrics.loadTime);
      }
    }
  }
  
  static trackApiCall(endpoint, duration, success = true) {
    const status = success ? 'success' : 'error';
    trackEvent('api_call', 'performance', `${endpoint}_${status}`, Math.round(duration));
    
    logInternalEvent('api_performance', 'api', endpoint, duration);
  }
}

// User behavior tracking
export const trackUserBehavior = {
  productView: (productId, productName) => {
    trackEvent('view_item', 'ecommerce', productId);
    
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'view_item', {
        currency: 'USD',
        value: 0,
        items: [{
          item_id: productId,
          item_name: productName,
          category: 'sea-moss'
        }]
      });
    }
  },
  
  addToCart: (productId, productName, price, quantity = 1) => {
    trackEvent('add_to_cart', 'ecommerce', productId, price * quantity);
    
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'add_to_cart', {
        currency: 'USD',
        value: (price * quantity) / 100,
        items: [{
          item_id: productId,
          item_name: productName,
          category: 'sea-moss',
          quantity: quantity,
          price: price / 100
        }]
      });
    }
  },
  
  beginCheckout: (cartValue, itemCount) => {
    trackEvent('begin_checkout', 'ecommerce', 'checkout_started', cartValue);
    
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'begin_checkout', {
        currency: 'USD',
        value: cartValue / 100,
        num_items: itemCount
      });
    }
  },
  
  searchQuery: (query, resultsCount = 0) => {
    trackEvent('search', 'engagement', query, resultsCount);
    
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'search', {
        search_term: query,
        results_count: resultsCount
      });
    }
  }
};

// Error tracking
export const trackError = (error, context = {}) => {
  console.error('Application Error:', error, context);
  
  trackEvent('javascript_error', 'error', error.message || 'Unknown error');
  
  // Send error to monitoring service
  logInternalEvent('error', 'system', error.message, 1);
  
  // Send to external error monitoring if configured
  if (typeof window !== 'undefined' && window.Sentry) {
    window.Sentry.captureException(error, { extra: context });
  }
};

// Conversion tracking
export const trackConversion = (type, value = 0) => {
  trackEvent('conversion', 'business', type, value);
  
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: process.env.NEXT_PUBLIC_GA_CONVERSION_ID,
      value: value / 100,
      currency: 'USD'
    });
  }
};

// Real User Monitoring (RUM)
export const initRUM = () => {
  if (typeof window !== 'undefined') {
    // Track Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'largest-contentful-paint') {
          trackEvent('lcp', 'performance', 'largest_contentful_paint', Math.round(entry.startTime));
        } else if (entry.entryType === 'first-input') {
          trackEvent('fid', 'performance', 'first_input_delay', Math.round(entry.processingStart - entry.startTime));
        } else if (entry.entryType === 'layout-shift') {
          if (!entry.hadRecentInput) {
            trackEvent('cls', 'performance', 'cumulative_layout_shift', Math.round(entry.value * 1000));
          }
        }
      });
    });
    
    try {
      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
    } catch (error) {
      console.warn('Performance observer not supported:', error);
    }
  }
};