'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Loader2, Lock, AlertCircle, CheckCircle, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/adapters/totalsAdapter';
import { track } from '@/utils/analytics';

interface Payments {
  card: (options?: CardOptions) => Promise<Card>;
  applePay: (request: ApplePayRequest) => Promise<ApplePay | null>;
  googlePay: (request: GooglePayRequest) => Promise<GooglePay | null>;
}

interface CardOptions {
  style?: {
    '.input-container'?: { borderColor?: string; borderRadius?: string };
    '.input-container.is-focus'?: { borderColor?: string };
    '.input-container.is-error'?: { borderColor?: string };
    input?: { fontSize?: string; fontFamily?: string; color?: string };
    'input::placeholder'?: { color?: string };
    '.message-text'?: { color?: string };
    '.message-icon'?: { color?: string };
    '.message-text.is-error'?: { color?: string };
  };
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

interface PaymentResult {
  paymentId: string;
  status: string;
  receiptUrl?: string;
  cardLast4?: string;
  cardBrand?: string;
}

export default function SquarePaymentForm({
  amountCents,
  orderId,
  squareOrderId,
  customer,
  onSuccess,
  onError,
  onCancel
}: SquarePaymentFormProps) {
  const [config, setConfig] = useState<SquareConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCardReady, setIsCardReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const [googlePayAvailable, setGooglePayAvailable] = useState(false);
  
  const cardRef = useRef<Card | null>(null);
  const applePayRef = useRef<ApplePay | null>(null);
  const googlePayRef = useRef<GooglePay | null>(null);
  const initRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const paymentIdempotencyKeyRef = useRef<string>('');

  // Store onError in a ref to use latest version without re-triggering effects
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/square/config');
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Failed to fetch Square config');
        }
        const data = await res.json();
        
        // Validate required fields
        if (!data.applicationId || !data.locationId) {
          throw new Error('Missing required Square configuration fields');
        }
        
        setConfig(data);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load Square config:', err);
        const errorMsg = err instanceof Error ? err.message : 'Payment system configuration error';
        // Use ref to always call the latest onError
        onErrorRef.current(errorMsg);
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, []); // Empty deps - fetch once on mount

  useEffect(() => {
    if (!config || initRef.current) return;
    initRef.current = true;

    const loadScript = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (window.Square) {
          resolve();
          return;
        }

        // Poll for window.Square in case it loads after script event
        let pollCount = 0;
        const maxPolls = 400; // 20 seconds at 50ms intervals
        const pollInterval = setInterval(() => {
          pollCount++;
          if (window.Square) {
            clearInterval(pollInterval);
            resolve();
            return;
          }
          if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
          }
        }, 50);

        const existingScript = document.querySelector(`script[src="${config.sdkUrl}"]`);
        if (existingScript) {
          if ((existingScript as HTMLScriptElement).getAttribute('data-loaded') === 'true') {
            clearInterval(pollInterval);
            resolve();
            return;
          }

          // Add timeout for existing script load (20 seconds)
          const timeoutId = setTimeout(() => {
            clearInterval(pollInterval);
            reject(new Error('Square SDK load timeout after 20 seconds'));
          }, 20000);

          existingScript.addEventListener('load', () => {
            clearInterval(pollInterval);
            clearTimeout(timeoutId);
            resolve();
          });
          existingScript.addEventListener('error', () => {
            clearInterval(pollInterval);
            clearTimeout(timeoutId);
            reject(new Error('Failed to load Square SDK'));
          });
          return;
        }

        // Add timeout for new script load (20 seconds)
        const timeoutId = setTimeout(() => {
          clearInterval(pollInterval);
          reject(new Error('Square SDK load timeout after 20 seconds'));
        }, 20000);

        const script = document.createElement('script');
        script.src = config.sdkUrl;
        script.async = true;
        script.onload = () => {
          clearInterval(pollInterval);
          clearTimeout(timeoutId);
          script.setAttribute('data-loaded', 'true');
          resolve();
        };
        script.onerror = () => {
          clearInterval(pollInterval);
          clearTimeout(timeoutId);
          reject(new Error('Failed to load Square SDK'));
        };
        document.head.appendChild(script);
      });
    };

    const initializePayments = async () => {
      try {
        await loadScript();

        if (!window.Square) {
          throw new Error('Square SDK not available');
        }

        const payments = await window.Square.payments(config.applicationId, config.locationId);

        const card = await payments.card({
          style: {
            '.input-container': {
              borderColor: '#d1d5db',
              borderRadius: '8px'
            },
            '.input-container.is-focus': {
              borderColor: '#10b981'
            },
            '.input-container.is-error': {
              borderColor: '#ef4444'
            },
            'input': {
              fontSize: '16px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              color: '#1f2937'
            },
            'input::placeholder': {
              color: '#9ca3af'
            },
            '.message-text': {
              color: '#6b7280'
            },
            '.message-icon': {
              color: '#6b7280'
            },
            '.message-text.is-error': {
              color: '#ef4444'
            }
          }
        });

        await card.attach('#card-container');
        cardRef.current = card;

        card.addEventListener('errorClassAdded', (e: any) => {
          setCardError(e.detail?.field ? `Invalid ${e.detail.field}` : 'Invalid card details');
        });
        
        card.addEventListener('errorClassRemoved', () => {
          setCardError(null);
        });

        setIsCardReady(true);
        setIsLoading(false);

        try {
          const totalAmount = (amountCents / 100).toFixed(2);
          const applePay = await payments.applePay({
            countryCode: 'US',
            currencyCode: 'USD',
            total: { amount: totalAmount, label: 'Taste of Gratitude' }
          });
          if (applePay) {
            applePayRef.current = applePay;
            setApplePayAvailable(true);
          }
        } catch (apErr) {
          console.log('Apple Pay not available');
        }

        try {
          const googlePay = await payments.googlePay({
            countryCode: 'US',
            currencyCode: 'USD'
          });
          if (googlePay) {
            await googlePay.attach('#google-pay-button');
            googlePayRef.current = googlePay;
            setGooglePayAvailable(true);
          }
        } catch (gpErr) {
          console.debug('Google Pay not available:', gpErr instanceof Error ? gpErr.message : 'Unknown error');
          // Google Pay not available in this browser/region - this is expected and not an error
        }

        track('payment_form_loaded', { 
          environment: config.environment,
          applePayAvailable: !!applePayRef.current,
          googlePayAvailable: !!googlePayRef.current
        });

      } catch (err) {
        console.error('Square payment initialization error:', err);
        const errorMsg = err instanceof Error ? err.message : 'Failed to initialize payment form';
        // Check if it's a timeout/network issue
        if (errorMsg.includes('timeout') || errorMsg.includes('SDK')) {
          onErrorRef.current('Payment form initialization timed out. Please refresh the page and try again.');
        } else {
          onErrorRef.current(errorMsg);
        }
        setIsLoading(false);
      }
    };

    initializePayments();

    return () => {
      // Cleanup payment in progress if component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      cardRef.current?.destroy().catch(console.error);
      applePayRef.current?.destroy?.().catch(console.error);
      googlePayRef.current?.destroy().catch(console.error);
    };
  }, [config, amountCents]); // Removed stableOnError - using ref instead

  const processPayment = useCallback(async (sourceId: string) => {
    try {
      // Create abort controller for this payment attempt (allow previous one to abort)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      
      // Generate or reuse idempotency key (for same payment attempt, same key)
      const idempotencyKey = paymentIdempotencyKeyRef.current || `payment_${orderId}_${Date.now()}`;
      if (!paymentIdempotencyKeyRef.current) {
        paymentIdempotencyKeyRef.current = idempotencyKey;
      }
      
      // Add 15 second timeout for payment request
      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, 15000);
      
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
          throw new Error(data.error || 'Payment processing failed');
        }

        track('payment_completed', {
          orderId,
          amount: amountCents / 100,
          paymentId: data.payment?.id
        });

        onSuccess({
          paymentId: data.payment.id,
          status: data.payment.status,
          receiptUrl: data.payment.receiptUrl,
          cardLast4: data.payment.cardLast4,
          cardBrand: data.payment.cardBrand
        });
      } catch (err) {
        clearTimeout(timeoutId);
        
        // Distinguish timeout from other errors
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error('Payment request timed out after 15 seconds - please try again');
        }
        throw err;
      }
    } catch (err) {
      // Don't silently ignore - let caller handle
      if (err instanceof Error && err.name === 'AbortError') {
        console.debug('Payment request cancelled');
        return;
      }
      throw err;
    }
  }, [amountCents, orderId, squareOrderId, customer, onSuccess]);

  const handleCardPayment = async () => {
    if (!cardRef.current || isProcessing) return;

    setIsProcessing(true);
    setCardError(null);
    track('payment_initiated', { method: 'card', orderId });

    try {
      const result = await cardRef.current.tokenize();

      if (result.status !== 'OK' || !result.token) {
        const errorMsg = result.errors?.[0]?.message || 'Card tokenization failed';
        setCardError(errorMsg);
        track('payment_tokenize_failed', { error: errorMsg });
        return;
      }

      await processPayment(result.token);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Payment failed';
      setCardError(errorMsg);
      track('payment_failed', { error: errorMsg, method: 'card' });
      onError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplePay = async () => {
    if (!applePayRef.current || isProcessing) return;

    setIsProcessing(true);
    track('payment_initiated', { method: 'apple_pay', orderId });

    try {
      const result = await applePayRef.current.tokenize();

      if (result.status !== 'OK' || !result.token) {
        throw new Error(result.errors?.[0]?.message || 'Apple Pay failed');
      }

      await processPayment(result.token);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Apple Pay failed';
      track('payment_failed', { error: errorMsg, method: 'apple_pay' });
      onError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGooglePay = async () => {
    if (!googlePayRef.current || isProcessing) return;

    setIsProcessing(true);
    track('payment_initiated', { method: 'google_pay', orderId });

    try {
      const result = await googlePayRef.current.tokenize();

      if (result.status !== 'OK' || !result.token) {
        throw new Error(result.errors?.[0]?.message || 'Google Pay failed');
      }

      await processPayment(result.token);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Google Pay failed';
      track('payment_failed', { error: errorMsg, method: 'google_pay' });
      onError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm text-gray-500">Loading secure payment form...</p>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {config?.environment === 'sandbox' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <strong>Sandbox Mode</strong> – Use test card: 4532 0155 0016 4662
          </div>
        </div>
      )}

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
          
          {googlePayAvailable && (
            <div id="google-pay-button" />
          )}

          {(applePayAvailable || googlePayAvailable) && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-500">or pay with card</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Details
          </label>
          <div 
            id="card-container"
            className={`min-h-[50px] p-3 border rounded-lg transition-colors ${
              cardError ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
            }`}
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
          disabled={!isCardReady || isProcessing}
          className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
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

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
        >
          Cancel and go back
        </button>
      )}
    </motion.div>
  );
}
