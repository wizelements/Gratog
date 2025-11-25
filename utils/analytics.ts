/**
 * Analytics utility - Tracks checkout events
 */

export type AnalyticsEvent = 
  | 'checkout_started'
  | 'checkout_stage_change'
  | 'fulfillment_type_selected'
  | 'contact_completed'
  | 'payment_initiated'
  | 'payment_completed'
  | 'payment_failed'
  | 'checkout_abandoned'
  | 'field_completion_time';

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
    console.log('[Analytics]', event, props);
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
