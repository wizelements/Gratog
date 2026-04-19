/**
 * Analytics utility - Tracks checkout events
 */

import { logger } from '@/lib/logger';

export type AnalyticsEvent = 
  | 'checkout_started'
  | 'checkout_stage_change'
  | 'checkout_proceed_to_payment'
  | 'checkout_validation_failed'
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
