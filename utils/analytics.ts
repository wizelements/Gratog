/**
 * Analytics utility - Tracks checkout events
 */

import { logger } from '@/lib/logger';

export type AnalyticsEvent = 
  | 'product_view'
  | 'product_add_to_cart'
  | 'product_lead_capture_shown'
  | 'product_preorder_click'
  | 'search_query'
  | 'search_suggestion_selected'
  | 'category_view'
  | 'ingredient_filter'
  | 'lead_form_view'
  | 'lead_captured'
  | 'home_preorder_click'
  | 'catalog_preorder_click'
  | 'market_preorder_click'
  | 'preorder_started'
  | 'preorder_market_selected'
  | 'preorder_submitted'
  | 'preorder_minimum_error'
  | 'preorder_status_viewed'
  | 'checkout_started'
  | 'checkout_stage_change'
  | 'checkout_proceed_to_payment'
  | 'checkout_validation_failed'
  | 'checkout_fulfillment_incomplete'
  | 'queue_joined'
  | 'queue_join_failed'
  | 'fulfillment_type_selected'
  | 'contact_completed'
  | 'payment_initiated'
  | 'payment_completed'
  | 'payment_failed'
  | 'payment_success'
  | 'payment_error'
  | 'payment_form_loaded'
  | 'payment_tokenize_failed'
  | 'checkout_abandoned'
  | 'field_completion_time'
  | 'order_created'
  | 'order_creation_failed'
  | 'checkout_payment_start'
  | 'checkout_payment_sdk_load_success'
  | 'checkout_payment_sdk_load_timeout'
  | 'checkout_square_init_success'
  | 'checkout_square_init_timeout'
  | 'checkout_payment_mount_success'
  | 'checkout_payment_mount_timeout'
  | 'checkout_payment_ready'
  | 'checkout_payment_processing'
  | 'checkout_payment_success'
  | 'checkout_payment_loading_sdk_fail'
  | 'checkout_payment_initializing_fail'
  | 'checkout_payment_mounting_fail'
  | 'checkout_payment_processing_fail'
  | `checkout_payment_${string}_fail`;

export interface AnalyticsProps {
  [key: string]: any;
}

const SERVER_TRACKED_EVENTS = new Set<string>([
  'product_view',
  'product_add_to_cart',
  'product_lead_capture_shown',
  'product_preorder_click',
  'search_query',
  'search_suggestion_selected',
  'category_view',
  'ingredient_filter',
  'lead_form_view',
  'lead_captured',
  'home_preorder_click',
  'catalog_preorder_click',
  'market_preorder_click',
  'preorder_started',
  'preorder_market_selected',
  'preorder_submitted',
  'preorder_minimum_error',
  'preorder_status_viewed',
  'checkout_started',
  'checkout_abandoned',
  'fulfillment_type_selected',
  'order_created',
  'order_creation_failed',
  'payment_success',
  'payment_error',
]);

function sendServerAnalytics(event: string, props: AnalyticsProps) {
  if (typeof window === 'undefined' || !SERVER_TRACKED_EVENTS.has(event)) return;

  const payload = JSON.stringify({ event, properties: props });
  try {
    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon('/api/analytics', new Blob([payload], { type: 'application/json' }));
      if (sent) return;
    }
  } catch {
    // fall through to fetch
  }

  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

/**
 * Track analytics event
 * Compatible with existing analytics system via custom DOM events
 */
export function track(event: AnalyticsEvent, props: AnalyticsProps = {}) {
  if (typeof window === 'undefined') return;
  
  // Emit custom event for analytics listener
  window.dispatchEvent(
    new CustomEvent('analytics', {
      detail: { event, ...props, timestamp: new Date().toISOString() }
    })
  );
  sendServerAnalytics(event, props);
  
  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    logger.info('Analytics', event, props);
  }
}

/**
 * Track checkout drop-off
 */
export function trackDropOff(stage: string, reason?: string) {
  track('checkout_abandoned', { stage, reason });
}

/**
 * Track form field completion time
 */
export function trackFieldTime(fieldName: string, timeMs: number) {
  track('field_completion_time', { field: fieldName, time_ms: timeMs });
}
