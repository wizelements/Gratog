/**
 * Checkout Telemetry - Observability for Checkout Flow
 * 
 * Tracks:
 * - Checkout funnel conversion
 * - Payment mount failures
 * - Top console errors
 * - Time-to-payment-render (p95)
 * 
 * Enable diagnostics with: NEXT_PUBLIC_CHECKOUT_DIAGNOSTICS=true
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger('CheckoutTelemetry');

// Check if diagnostics mode is enabled
const DIAGNOSTICS_ENABLED = process.env.NEXT_PUBLIC_CHECKOUT_DIAGNOSTICS === 'true';

export interface CheckoutEvent {
  event: string;
  timestamp: number;
  orderId?: string;
  step?: string;
  duration?: number;
  error?: string;
  metadata?: Record<string, any>;
}

// In-memory buffer for events (flushed periodically)
const eventBuffer: CheckoutEvent[] = [];
const MAX_BUFFER_SIZE = 100;

/**
 * Track a checkout event
 */
export function trackCheckoutEvent(
  event: string,
  data?: Partial<CheckoutEvent>
): void {
  const checkoutEvent: CheckoutEvent = {
    event,
    timestamp: Date.now(),
    ...data,
  };

  // Always log in debug mode
  if (DIAGNOSTICS_ENABLED) {
    console.debug('[Checkout]', event, data);
  }

  // Log to structured logger
  logger.info(event, checkoutEvent);

  // Add to buffer
  eventBuffer.push(checkoutEvent);
  if (eventBuffer.length > MAX_BUFFER_SIZE) {
    eventBuffer.shift();
  }

  // Send critical events immediately
  if (event.includes('fail') || event.includes('error')) {
    sendToAnalytics(checkoutEvent);
  }
}

/**
 * Checkout funnel events
 */
export const CheckoutEvents = {
  // Funnel steps
  CART_VIEWED: 'checkout_cart_viewed',
  FORM_STARTED: 'checkout_form_started',
  FULFILLMENT_SELECTED: 'checkout_fulfillment_selected',
  FORM_SUBMITTED: 'checkout_form_submitted',
  ORDER_CREATED: 'checkout_order_created',
  PAYMENT_STARTED: 'checkout_payment_started',
  PAYMENT_COMPLETED: 'checkout_payment_completed',
  
  // Payment SDK events
  SDK_LOAD_START: 'checkout_payment_sdk_load_start',
  SDK_LOAD_SUCCESS: 'checkout_payment_sdk_load_success',
  SDK_LOAD_FAIL: 'checkout_payment_sdk_load_fail',
  SDK_LOAD_TIMEOUT: 'checkout_payment_sdk_load_timeout',
  
  SQUARE_INIT_START: 'checkout_square_init_start',
  SQUARE_INIT_SUCCESS: 'checkout_square_init_success',
  SQUARE_INIT_FAIL: 'checkout_square_init_fail',
  SQUARE_INIT_TIMEOUT: 'checkout_square_init_timeout',
  
  CARD_MOUNT_START: 'checkout_payment_mount_start',
  CARD_MOUNT_SUCCESS: 'checkout_payment_mount_success',
  CARD_MOUNT_FAIL: 'checkout_payment_mount_fail',
  CARD_MOUNT_TIMEOUT: 'checkout_payment_render_timeout',
  
  TOKENIZE_START: 'checkout_payment_tokenize_start',
  TOKENIZE_SUCCESS: 'checkout_payment_tokenize_success',
  TOKENIZE_FAIL: 'checkout_payment_tokenize_fail',
  
  PAYMENT_REQUEST_START: 'checkout_payment_request_start',
  PAYMENT_REQUEST_SUCCESS: 'checkout_payment_request_success',
  PAYMENT_REQUEST_FAIL: 'checkout_payment_request_fail',
  
  // Retry events
  PAYMENT_RETRY: 'checkout_payment_retry',
  
  // Validation events
  DELIVERY_MIN_BLOCKED: 'checkout_delivery_min_blocked',
  FORM_VALIDATION_FAIL: 'checkout_form_validation_fail',
} as const;

/**
 * Track time-to-render for payment form
 */
let paymentRenderStartTime: number | null = null;

export function startPaymentRenderTimer(): void {
  paymentRenderStartTime = Date.now();
}

export function endPaymentRenderTimer(success: boolean): number {
  if (!paymentRenderStartTime) return 0;
  
  const duration = Date.now() - paymentRenderStartTime;
  paymentRenderStartTime = null;
  
  trackCheckoutEvent(
    success ? CheckoutEvents.CARD_MOUNT_SUCCESS : CheckoutEvents.CARD_MOUNT_FAIL,
    { duration, metadata: { renderTimeMs: duration } }
  );
  
  return duration;
}

/**
 * Get checkout funnel metrics
 */
export function getCheckoutMetrics(): {
  totalEvents: number;
  funnelDropoff: Record<string, number>;
  errorRate: number;
  avgRenderTime: number;
} {
  const funnelSteps = [
    CheckoutEvents.CART_VIEWED,
    CheckoutEvents.FORM_STARTED,
    CheckoutEvents.FORM_SUBMITTED,
    CheckoutEvents.ORDER_CREATED,
    CheckoutEvents.PAYMENT_STARTED,
    CheckoutEvents.PAYMENT_COMPLETED,
  ];

  const funnelDropoff: Record<string, number> = {};
  funnelSteps.forEach(step => {
    funnelDropoff[step] = eventBuffer.filter(e => e.event === step).length;
  });

  const errorEvents = eventBuffer.filter(e => 
    e.event.includes('fail') || e.event.includes('error') || e.event.includes('timeout')
  );

  const renderTimes = eventBuffer
    .filter(e => e.event === CheckoutEvents.CARD_MOUNT_SUCCESS && e.duration)
    .map(e => e.duration!);

  return {
    totalEvents: eventBuffer.length,
    funnelDropoff,
    errorRate: eventBuffer.length > 0 ? (errorEvents.length / eventBuffer.length) * 100 : 0,
    avgRenderTime: renderTimes.length > 0 
      ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length 
      : 0,
  };
}

/**
 * Send event to analytics (implement based on your analytics provider)
 */
function sendToAnalytics(event: CheckoutEvent): void {
  // If using a third-party analytics service, send here
  // Example: segment.track(event.event, event);
  
  // For now, just log critical events
  if (event.event.includes('fail') || event.event.includes('error')) {
    logger.error('Checkout critical event', event);
  }
}

/**
 * Diagnostic mode - capture DOM state for debugging
 */
export function capturePaymentFormDiagnostics(): {
  cardContainerExists: boolean;
  cardContainerVisible: boolean;
  cardContainerDimensions: { width: number; height: number } | null;
  squareScriptLoaded: boolean;
  squareObjectAvailable: boolean;
  iframesCount: number;
} {
  if (typeof window === 'undefined') {
    return {
      cardContainerExists: false,
      cardContainerVisible: false,
      cardContainerDimensions: null,
      squareScriptLoaded: false,
      squareObjectAvailable: false,
      iframesCount: 0,
    };
  }

  const container = document.getElementById('card-container');
  const squareScript = document.querySelector('script[src*="square"]');
  const iframes = document.querySelectorAll('iframe[src*="square"]');

  let containerVisible = false;
  let dimensions: { width: number; height: number } | null = null;

  if (container) {
    const rect = container.getBoundingClientRect();
    const style = window.getComputedStyle(container);
    containerVisible = 
      style.display !== 'none' && 
      style.visibility !== 'hidden' && 
      rect.height > 0;
    dimensions = { width: rect.width, height: rect.height };
  }

  return {
    cardContainerExists: !!container,
    cardContainerVisible: containerVisible,
    cardContainerDimensions: dimensions,
    squareScriptLoaded: !!squareScript,
    squareObjectAvailable: !!(window as any).Square,
    iframesCount: iframes.length,
  };
}

/**
 * Log diagnostics to console (for debugging)
 */
export function logPaymentDiagnostics(): void {
  if (!DIAGNOSTICS_ENABLED) return;
  
  const diag = capturePaymentFormDiagnostics();
  console.group('[Checkout Diagnostics]');
  console.log('Card Container Exists:', diag.cardContainerExists);
  console.log('Card Container Visible:', diag.cardContainerVisible);
  console.log('Container Dimensions:', diag.cardContainerDimensions);
  console.log('Square Script Loaded:', diag.squareScriptLoaded);
  console.log('Square Object Available:', diag.squareObjectAvailable);
  console.log('Square iFrames:', diag.iframesCount);
  console.groupEnd();
}
