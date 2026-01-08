'use client';

/**
 * Payment Loader State Machine
 * 
 * States: idle → loading_sdk → initializing → mounting → ready | error
 * 
 * Provides:
 * - Timeout handling for every async step
 * - Clear error states with retry capability
 * - Telemetry events for every transition
 * - Visual feedback for each state
 */

import { useReducer, useCallback, useRef, useEffect } from 'react';
import { track } from '@/utils/analytics';

export type PaymentState = 
  | 'idle'
  | 'loading_sdk'
  | 'initializing'
  | 'mounting'
  | 'ready'
  | 'error';

export interface PaymentError {
  code: string;
  message: string;
  retryable: boolean;
  step: PaymentState;
}

interface PaymentStateContext {
  state: PaymentState;
  error: PaymentError | null;
  retryCount: number;
  startTime: number | null;
}

type PaymentAction =
  | { type: 'START_LOADING' }
  | { type: 'SDK_LOADED' }
  | { type: 'INITIALIZING' }
  | { type: 'MOUNTING' }
  | { type: 'READY' }
  | { type: 'ERROR'; error: PaymentError }
  | { type: 'RETRY' }
  | { type: 'RESET' };

const initialState: PaymentStateContext = {
  state: 'idle',
  error: null,
  retryCount: 0,
  startTime: null,
};

function paymentReducer(state: PaymentStateContext, action: PaymentAction): PaymentStateContext {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, state: 'loading_sdk', error: null, startTime: Date.now() };
    case 'SDK_LOADED':
      return { ...state, state: 'initializing' };
    case 'INITIALIZING':
      return { ...state, state: 'initializing' };
    case 'MOUNTING':
      return { ...state, state: 'mounting' };
    case 'READY':
      return { ...state, state: 'ready', error: null };
    case 'ERROR':
      return { ...state, state: 'error', error: action.error };
    case 'RETRY':
      return { ...state, state: 'idle', error: null, retryCount: state.retryCount + 1 };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// Timeouts for each step (ms)
const TIMEOUTS = {
  loading_sdk: 15000,    // 15s for SDK load
  initializing: 10000,   // 10s for payments() init
  mounting: 10000,       // 10s for card.attach()
};

// Error codes
export const ERROR_CODES = {
  SDK_LOAD_TIMEOUT: 'SDK_LOAD_TIMEOUT',
  SDK_LOAD_FAILED: 'SDK_LOAD_FAILED',
  INIT_TIMEOUT: 'INIT_TIMEOUT',
  INIT_FAILED: 'INIT_FAILED',
  MOUNT_TIMEOUT: 'MOUNT_TIMEOUT',
  MOUNT_FAILED: 'MOUNT_FAILED',
  DOMAIN_NOT_REGISTERED: 'DOMAIN_NOT_REGISTERED',
  CONFIG_ERROR: 'CONFIG_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN: 'UNKNOWN',
};

export function usePaymentStateMachine(orderId: string) {
  const [context, dispatch] = useReducer(paymentReducer, initialState);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearCurrentTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const logTelemetry = useCallback((event: string, data?: Record<string, any>) => {
    const elapsed = context.startTime ? Date.now() - context.startTime : 0;
    track(event as import('@/utils/analytics').AnalyticsEvent, { orderId, elapsed, retryCount: context.retryCount, ...data });
    console.debug(`[PaymentSM] ${event}`, { orderId, elapsed, ...data });
  }, [orderId, context.startTime, context.retryCount]);

  const setError = useCallback((code: string, message: string, step: PaymentState, retryable = true) => {
    clearCurrentTimeout();
    const error: PaymentError = { code, message, retryable, step };
    dispatch({ type: 'ERROR', error });
    logTelemetry(`checkout_payment_${step}_fail`, { errorCode: code, errorMessage: message });
  }, [clearCurrentTimeout, logTelemetry]);

  const startLoading = useCallback(() => {
    clearCurrentTimeout();
    dispatch({ type: 'START_LOADING' });
    logTelemetry('checkout_payment_start');
    
    // Set timeout for SDK loading
    timeoutRef.current = setTimeout(() => {
      setError(
        ERROR_CODES.SDK_LOAD_TIMEOUT,
        'Payment SDK took too long to load. Please check your internet connection.',
        'loading_sdk'
      );
      logTelemetry('checkout_payment_sdk_load_timeout');
    }, TIMEOUTS.loading_sdk);
  }, [clearCurrentTimeout, logTelemetry, setError]);

  const sdkLoaded = useCallback(() => {
    clearCurrentTimeout();
    dispatch({ type: 'SDK_LOADED' });
    logTelemetry('checkout_payment_sdk_load_success');
    
    // Set timeout for initialization
    timeoutRef.current = setTimeout(() => {
      setError(
        ERROR_CODES.INIT_TIMEOUT,
        'Payment initialization timed out. This may be a temporary issue.',
        'initializing'
      );
      logTelemetry('checkout_square_init_timeout');
    }, TIMEOUTS.initializing);
  }, [clearCurrentTimeout, logTelemetry, setError]);

  const initComplete = useCallback(() => {
    clearCurrentTimeout();
    dispatch({ type: 'MOUNTING' });
    logTelemetry('checkout_square_init_success');
    
    // Set timeout for mounting
    timeoutRef.current = setTimeout(() => {
      setError(
        ERROR_CODES.MOUNT_TIMEOUT,
        'Payment form failed to render. Please try refreshing the page.',
        'mounting'
      );
      logTelemetry('checkout_payment_render_timeout');
    }, TIMEOUTS.mounting);
  }, [clearCurrentTimeout, logTelemetry, setError]);

  const mountComplete = useCallback(() => {
    clearCurrentTimeout();
    dispatch({ type: 'READY' });
    logTelemetry('checkout_payment_mount_success');
  }, [clearCurrentTimeout, logTelemetry]);

  const handleError = useCallback((code: string, message: string, step: PaymentState = 'error') => {
    // Detect specific error types
    let errorCode = code;
    let errorMessage = message;
    let retryable = true;

    if (message.toLowerCase().includes('domain') || message.toLowerCase().includes('origin')) {
      errorCode = ERROR_CODES.DOMAIN_NOT_REGISTERED;
      errorMessage = `Your domain is not registered in Square Dashboard. Please add "${window.location.origin}" to Web Payments SDK settings.`;
      retryable = false;
    } else if (message.toLowerCase().includes('config') || message.toLowerCase().includes('missing')) {
      errorCode = ERROR_CODES.CONFIG_ERROR;
      retryable = false;
    } else if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
      errorCode = ERROR_CODES.NETWORK_ERROR;
      errorMessage = 'Network error. Please check your connection and try again.';
    }

    setError(errorCode, errorMessage, step, retryable);
  }, [setError]);

  const retry = useCallback(() => {
    if (context.retryCount >= 3) {
      setError(
        'MAX_RETRIES',
        'Maximum retry attempts reached. Please contact support or try again later.',
        context.error?.step || 'error',
        false
      );
      return;
    }
    clearCurrentTimeout();
    dispatch({ type: 'RETRY' });
    logTelemetry('checkout_payment_retry', { attempt: context.retryCount + 1 });
  }, [context.retryCount, context.error, clearCurrentTimeout, logTelemetry, setError]);

  const reset = useCallback(() => {
    clearCurrentTimeout();
    dispatch({ type: 'RESET' });
  }, [clearCurrentTimeout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearCurrentTimeout();
  }, [clearCurrentTimeout]);

  return {
    state: context.state,
    error: context.error,
    retryCount: context.retryCount,
    isLoading: ['loading_sdk', 'initializing', 'mounting'].includes(context.state),
    isReady: context.state === 'ready',
    isError: context.state === 'error',
    canRetry: context.error?.retryable && context.retryCount < 3,
    actions: {
      startLoading,
      sdkLoaded,
      initComplete,
      mountComplete,
      handleError,
      retry,
      reset,
    },
  };
}

// State-specific loading messages
export const STATE_MESSAGES: Record<PaymentState, string> = {
  idle: 'Preparing payment form...',
  loading_sdk: 'Loading secure payment SDK...',
  initializing: 'Initializing payment system...',
  mounting: 'Setting up card fields...',
  ready: 'Payment form ready',
  error: 'Payment form error',
};
