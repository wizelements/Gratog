'use client';

/**
 * SquarePaymentForm V2 - Enhanced with State Machine
 * 
 * Key improvements:
 * - Payment state machine with timeouts at every step
 * - Clear error UI with retry capability
 * - Telemetry events for monitoring
 * - No silent failures
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Lock, CheckCircle, Smartphone, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/adapters/totalsAdapter';
import { usePaymentStateMachine, STATE_MESSAGES, ERROR_CODES } from './PaymentStateMachine';
import { PaymentErrorUI, PaymentLoadingUI } from './PaymentErrorUI';

// Square SDK types
interface Payments {
  card: (options?: CardOptions) => Promise<Card>;
  applePay: (request: ApplePayRequest) => Promise<ApplePay | null>;
  googlePay: (request: GooglePayRequest) => Promise<GooglePay | null>;
}

interface CardOptions {
  style?: Record<string, Record<string, string>>;
}

interface Card {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<TokenResult>;
  destroy: () => Promise<void>;
  addEventListener: (event: string, callback: (e: any) => void) => void;
}

interface ApplePay {
  tokenize: () => Promise<TokenResult>;
  destroy: () => Promise<void>;
}

interface GooglePay {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<TokenResult>;
  destroy: () => Promise<void>;
}

interface ApplePayRequest {
  countryCode: string;
  currencyCode: string;
  total: { amount: string; label: string };
}

interface GooglePayRequest {
  countryCode: string;
  currencyCode: string;
  total?: { amount: string };
}

interface TokenResult {
  status: 'OK' | 'ERROR';
  token?: string;
  errors?: Array<{ type: string; message: string; field?: string }>;
}

interface SquareConfig {
  applicationId: string;
  locationId: string;
  environment: 'sandbox' | 'production';
  sdkUrl: string;
}

interface PaymentResult {
  paymentId: string;
  status: string;
  receiptUrl?: string;
  cardLast4?: string;
  cardBrand?: string;
}

interface SquarePaymentFormProps {
  amountCents: number;
  orderId: string;
  squareOrderId?: string;
  customer: {
    email: string;
    name: string;
    phone?: string;
  };
  onSuccess: (paymentResult: PaymentResult) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}

// Extend Window for Square SDK
declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => Promise<Payments>;
    };
  }
}

export default function SquarePaymentFormV2({
  amountCents,
  orderId,
  squareOrderId,
  customer,
  onSuccess,
  onError,
  onCancel
}: SquarePaymentFormProps) {
  // State machine for payment flow
  const paymentSM = usePaymentStateMachine(orderId);
  
  // Local state
  const [config, setConfig] = useState<SquareConfig | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const [googlePayAvailable, setGooglePayAvailable] = useState(false);
  
  // Refs
  const cardRef = useRef<Card | null>(null);
  const applePayRef = useRef<ApplePay | null>(null);
  const googlePayRef = useRef<GooglePay | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initAttemptRef = useRef(0);
  
  // Stable idempotency key
  const [stableIdempotencyKey] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const storageKey = `payment_idem_${orderId}`;
    let existingKey = sessionStorage.getItem(storageKey);
    if (!existingKey) {
      existingKey = `pay_${orderId.slice(0, 36)}`;
      sessionStorage.setItem(storageKey, existingKey);
    }
    return existingKey;
  });

  // Cleanup function
  const cleanup = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    try {
      await cardRef.current?.destroy();
      await applePayRef.current?.destroy?.();
      await googlePayRef.current?.destroy();
    } catch (e) {
      console.debug('[Square] Cleanup error (ignorable):', e);
    }
    cardRef.current = null;
    applePayRef.current = null;
    googlePayRef.current = null;
  }, []);

  // Fetch config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/square/config');
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch payment config');
        }
        const data = await res.json();
        
        if (!data.applicationId || !data.locationId) {
          throw new Error('Missing required payment configuration');
        }
        
        setConfig(data);
      } catch (err) {
        console.error('[Square] Config fetch failed:', err);
        paymentSM.actions.handleError(
          ERROR_CODES.CONFIG_ERROR,
          err instanceof Error ? err.message : 'Configuration error',
          'idle'
        );
      }
    };
    fetchConfig();
  }, []);

  // Initialize payment form when config is ready or on retry
  useEffect(() => {
    if (!config) return;
    if (paymentSM.state !== 'idle') return;
    
    initAttemptRef.current += 1;
    const currentAttempt = initAttemptRef.current;
    
    const initialize = async () => {
      // Start loading
      paymentSM.actions.startLoading();
      
      try {
        // Step 1: Load SDK
        await loadSquareSDK(config.sdkUrl);
        
        if (currentAttempt !== initAttemptRef.current) return; // Cancelled
        paymentSM.actions.sdkLoaded();

        // Step 2: Initialize payments
        if (!window.Square) {
          throw new Error('Square SDK not available');
        }
        
        console.debug('[Square] Initializing with appId:', config.applicationId.slice(0, 10) + '...');
        let payments: Payments;
        try {
          payments = await window.Square.payments(config.applicationId, config.locationId);
        } catch (initErr: any) {
          const msg = initErr?.message || initErr?.toString() || 'Unknown';
          if (msg.includes('domain') || msg.includes('origin') || msg.includes('not authorized')) {
            throw new Error(`Domain not authorized. Add "${window.location.origin}" to Square Dashboard > Web Payments SDK.`);
          }
          throw new Error(`Square init failed: ${msg}`);
        }
        
        if (currentAttempt !== initAttemptRef.current) return;
        paymentSM.actions.initComplete();

        // Step 3: Create and mount card
        const card = await payments.card({
          style: {
            '.input-container': { borderColor: '#d1d5db', borderRadius: '8px' },
            '.input-container.is-focus': { borderColor: '#10b981' },
            '.input-container.is-error': { borderColor: '#ef4444' },
            'input': { fontSize: '16px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1f2937' },
            'input::placeholder': { color: '#9ca3af' },
            '.message-text': { color: '#6b7280' },
            '.message-text.is-error': { color: '#ef4444' },
          }
        });

        // Check mount point exists
        const mountPoint = document.getElementById('card-container');
        if (!mountPoint) {
          throw new Error('Card container element not found');
        }

        await card.attach('#card-container');
        cardRef.current = card;

        // Add error listeners
        card.addEventListener('errorClassAdded', (e: any) => {
          setCardError(e.detail?.field ? `Invalid ${e.detail.field}` : 'Invalid card details');
        });
        card.addEventListener('errorClassRemoved', () => {
          setCardError(null);
        });

        if (currentAttempt !== initAttemptRef.current) return;
        paymentSM.actions.mountComplete();

        // Try to set up Apple Pay / Google Pay (non-blocking)
        setupDigitalWallets(payments, amountCents);

      } catch (err) {
        console.error('[Square] Initialization failed:', err);
        if (currentAttempt === initAttemptRef.current) {
          paymentSM.actions.handleError(
            ERROR_CODES.UNKNOWN,
            err instanceof Error ? err.message : 'Payment initialization failed',
            paymentSM.state as any
          );
        }
      }
    };

    initialize();

    return () => {
      cleanup();
    };
  }, [config, paymentSM.state, paymentSM.retryCount]);

  // Load Square SDK script
  const loadSquareSDK = (sdkUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      console.debug('[Square] Loading SDK from:', sdkUrl);
      
      if (window.Square) {
        console.debug('[Square] SDK already loaded');
        resolve();
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error('SDK load timeout'));
      }, 15000);

      const existingScript = document.querySelector(`script[src="${sdkUrl}"]`);
      if (existingScript) {
        const checkLoaded = setInterval(() => {
          if (window.Square) {
            clearInterval(checkLoaded);
            clearTimeout(timeoutId);
            resolve();
          }
        }, 100);
        return;
      }

      const script = document.createElement('script');
      script.src = sdkUrl;
      script.async = true;
      script.onload = () => {
        clearTimeout(timeoutId);
        // Wait a tick for Square to be available
        setTimeout(() => {
          if (window.Square) {
            resolve();
          } else {
            reject(new Error('SDK loaded but Square not available'));
          }
        }, 100);
      };
      script.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error('Failed to load payment SDK'));
      };
      document.head.appendChild(script);
    });
  };

  // Setup digital wallets (non-blocking)
  const setupDigitalWallets = async (payments: Payments, amount: number) => {
    const totalAmount = (amount / 100).toFixed(2);
    
    try {
      const applePay = await payments.applePay({
        countryCode: 'US',
        currencyCode: 'USD',
        total: { amount: totalAmount, label: 'Taste of Gratitude' }
      });
      if (applePay) {
        applePayRef.current = applePay;
        setApplePayAvailable(true);
      }
    } catch (e) {
      console.debug('[Square] Apple Pay not available');
    }

    try {
      const googlePay = await payments.googlePay({ countryCode: 'US', currencyCode: 'USD' });
      if (googlePay) {
        await googlePay.attach('#google-pay-button');
        googlePayRef.current = googlePay;
        setGooglePayAvailable(true);
      }
    } catch (e) {
      console.debug('[Square] Google Pay not available');
    }
  };

  // Process payment
  const processPayment = useCallback(async (sourceId: string) => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    const idempotencyKey = stableIdempotencyKey || `pay_${orderId.slice(0, 36)}`;
    
    const timeoutId = setTimeout(() => {
      abortControllerRef.current?.abort();
    }, 30000);

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          amountCents,
          currency: 'USD',
          orderId,
          squareOrderId,
          customer,
          idempotencyKey
        }),
        signal: abortControllerRef.current.signal
      });

      clearTimeout(timeoutId);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Payment failed');
      }

      onSuccess({
        paymentId: data.payment.id,
        status: data.payment.status,
        receiptUrl: data.payment.receiptUrl,
        cardLast4: data.payment.cardLast4,
        cardBrand: data.payment.cardBrand
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Payment request timed out');
      }
      throw err;
    }
  }, [amountCents, orderId, squareOrderId, customer, onSuccess, stableIdempotencyKey]);

  // Handle card payment
  const handleCardPayment = async () => {
    if (!cardRef.current || isProcessing) return;

    setIsProcessing(true);
    setCardError(null);

    try {
      const result = await cardRef.current.tokenize();

      if (result.status !== 'OK' || !result.token) {
        const errorMsg = result.errors?.[0]?.message || 'Card tokenization failed';
        setCardError(errorMsg);
        return;
      }

      await processPayment(result.token);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Payment failed';
      setCardError(errorMsg);
      onError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Apple Pay
  const handleApplePay = async () => {
    if (!applePayRef.current || isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await applePayRef.current.tokenize();
      if (result.status !== 'OK' || !result.token) {
        throw new Error(result.errors?.[0]?.message || 'Apple Pay failed');
      }
      await processPayment(result.token);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Apple Pay failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle retry
  const handleRetry = () => {
    cleanup();
    paymentSM.actions.retry();
  };

  // Handle back
  const handleBack = () => {
    cleanup();
    onCancel?.();
  };

  // Render error state
  if (paymentSM.isError && paymentSM.error) {
    return (
      <PaymentErrorUI
        error={paymentSM.error}
        onRetry={handleRetry}
        onBack={handleBack}
        canRetry={paymentSM.canRetry}
        retryCount={paymentSM.retryCount}
      />
    );
  }

  // Render loading state
  if (paymentSM.isLoading || !config) {
    return (
      <PaymentLoadingUI
        state={paymentSM.state}
        message={STATE_MESSAGES[paymentSM.state] || 'Loading...'}
      />
    );
  }

  // Render ready state
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Sandbox mode indicator */}
      {config.environment === 'sandbox' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <strong>Test Mode</strong> – Use card: 4532 0155 0016 4662
          </div>
        </div>
      )}

      {/* Digital Wallets */}
      {(applePayAvailable || googlePayAvailable) && (
        <div className="space-y-3">
          {applePayAvailable && (
            <Button
              type="button"
              onClick={handleApplePay}
              disabled={isProcessing}
              className="w-full h-12 bg-black hover:bg-gray-900 text-white"
            >
              <Smartphone className="w-5 h-5 mr-2" />
              Apple Pay
            </Button>
          )}
          
          {googlePayAvailable && <div id="google-pay-button" />}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-gray-500">or pay with card</span>
            </div>
          </div>
        </div>
      )}

      {/* Card Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Details
          </label>
          <div 
            id="card-container"
            className={`min-h-[130px] p-3 border rounded-lg transition-colors ${
              cardError ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
            }`}
            style={{ minHeight: '130px' }}
          />
          {cardError && (
            <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {cardError}
            </p>
          )}
        </div>

        <Button
          type="button"
          onClick={handleCardPayment}
          disabled={!paymentSM.isReady || isProcessing}
          className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Pay {formatCurrency(amountCents / 100)}
            </div>
          )}
        </Button>
      </div>

      {/* Security footer */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-500 pt-2">
        <div className="flex items-center gap-1">
          <Lock className="w-3 h-3" />
          <span>256-bit encryption</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          <span>PCI compliant</span>
        </div>
        <span className="text-gray-300">|</span>
        <span>Powered by Square</span>
      </div>

      {/* Cancel button */}
      {onCancel && (
        <button
          type="button"
          onClick={handleBack}
          disabled={isProcessing}
          className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
        >
          Cancel and go back
        </button>
      )}
    </motion.div>
  );
}
