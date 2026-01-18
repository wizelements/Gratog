'use client';

/**
 * SquarePaymentForm - Based on working TOG implementation
 * 
 * Key principles:
 * - Always render card-container in DOM (Square needs it to attach)
 * - Simple loading state with spinner overlay
 * - No complex state machine - just straightforward flow
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { CreditCard, Loader2, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/adapters/totalsAdapter';
import type { SquareCard, SquareCardOptions, SquarePayments, SquareTokenResult } from '@/types/square';

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
  onSuccess: (result: PaymentResult) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}

interface PaymentResult {
  paymentId: string;
  status: string;
  receiptUrl?: string;
  cardLast4?: string;
  cardBrand?: string;
  amountCents?: number;
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
  const [initError, setInitError] = useState<string | null>(null);
  
  const cardRef = useRef<SquareCard | null>(null);
  const initRef = useRef(false);
  
  // Generate idempotency key (Square limits to 45 chars)
  const generateIdempotencyKey = () => `${orderId.slice(0, 32)}_${Date.now().toString(36)}`;

  // Fetch Square config from API
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/square/config');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch payment config');
        }
        const data = await res.json();
        if (!data.applicationId || !data.locationId) {
          throw new Error('Invalid payment configuration');
        }
        console.log('[Square] Config loaded:', {
          appId: data.applicationId.slice(0, 12) + '...',
          locationId: data.locationId,
          environment: data.environment
        });
        setConfig(data);
      } catch (err) {
        console.error('[Square] Config error:', err);
        setInitError(err instanceof Error ? err.message : 'Configuration error');
        onError('Payment system unavailable. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, [onError]);

  // Initialize Square SDK and attach card
  useEffect(() => {
    if (!config || initRef.current) return;
    initRef.current = true;

    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let intervalId: NodeJS.Timeout | null = null;

    const loadScript = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (window.Square) {
          resolve();
          return;
        }

        const existingScript = document.querySelector(`script[src="${config.sdkUrl}"]`);
        if (existingScript) {
          // Script exists, wait for it to load
          intervalId = setInterval(() => {
            if (window.Square) {
              if (intervalId) clearInterval(intervalId);
              if (isMounted) resolve();
            }
          }, 100);
          timeoutId = setTimeout(() => {
            if (intervalId) clearInterval(intervalId);
            if (isMounted) reject(new Error('SDK load timeout'));
          }, 15000);
          return;
        }

        const script = document.createElement('script');
        script.src = config.sdkUrl;
        script.async = true;
        script.onload = () => {
          // Give SDK a moment to initialize
          timeoutId = setTimeout(() => {
            if (window.Square && isMounted) resolve();
            else if (isMounted) reject(new Error('SDK loaded but Square not available'));
          }, 100);
        };
        script.onerror = () => {
          if (isMounted) reject(new Error('Failed to load Square SDK'));
        };
        document.head.appendChild(script);
      });
    };

    const initializePayments = async () => {
      try {
        console.log('[Square] Loading SDK...');
        await loadScript();
        console.log('[Square] SDK loaded');

        if (!window.Square) {
          throw new Error('Square SDK not available');
        }

        console.log('[Square] Initializing payments...');
        const payments = await window.Square.payments(config.applicationId, config.locationId);
        console.log('[Square] Payments initialized');

        const card = await payments.card({
          style: {
            '.input-container': { borderColor: '#d1d5db', borderRadius: '8px' },
            '.input-container.is-focus': { borderColor: '#10b981' },
            '.input-container.is-error': { borderColor: '#ef4444' },
            'input': { fontSize: '16px', fontFamily: 'sans-serif', color: '#1f2937' },
            'input::placeholder': { color: '#9ca3af' }
          }
        });

        // Wait for DOM to be ready
        const cardContainer = document.getElementById('card-container');
        if (!cardContainer) {
          throw new Error('Card container not found in DOM');
        }

        console.log('[Square] Attaching card to container...');
        await card.attach('#card-container');
        console.log('[Square] Card attached successfully');

        card.addEventListener('cardBrandChanged', () => setCardError(null));
        card.addEventListener('errorClassAdded', () => setCardError('Please check your card details'));
        card.addEventListener('errorClassRemoved', () => setCardError(null));
        card.addEventListener('focusClassAdded', () => setCardError(null));

        cardRef.current = card;
        setIsCardReady(true);

      } catch (err) {
        console.error('[Square] Initialization failed:', err);
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setInitError(errorMsg);
        onError(`Payment form error: ${errorMsg}`);
      }
    };

    // Small delay to ensure DOM is ready
    const startTimeout = setTimeout(initializePayments, 100);

    return () => {
      isMounted = false;
      clearTimeout(startTimeout);
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
      
      if (cardRef.current) {
        cardRef.current.destroy().catch(console.error);
        cardRef.current = null;
      }
    };
  }, [config, onError]);

  const processPayment = useCallback(async (sourceId: string) => {
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
        idempotencyKey: generateIdempotencyKey()
      })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Payment processing failed');
    }

    onSuccess({
      paymentId: data.payment.id,
      status: data.payment.status,
      receiptUrl: data.payment.receiptUrl,
      cardLast4: data.payment.cardLast4,
      cardBrand: data.payment.cardBrand,
      amountCents: data.payment.amountCents || amountCents
    });
  }, [amountCents, orderId, squareOrderId, customer, onSuccess]);

  const handleCardPayment = useCallback(async () => {
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
  }, [isProcessing, processPayment, onError]);

  // Show error state if initialization failed
  if (initError && !isCardReady) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="font-semibold text-red-800 mb-2">Payment Form Error</h3>
        <p className="text-red-600 text-sm mb-4">{initError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sandbox Mode Warning */}
      {config?.environment === 'sandbox' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <strong>Test Mode</strong> – Use card: 4532 0155 0016 4662
          </div>
        </div>
      )}

      {/* Card Form - ALWAYS render so Square can attach */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Details
          </label>
          <div className="relative">
            <div 
              id="card-container"
              className={`min-h-[50px] p-3 border rounded-lg transition-colors ${
                cardError ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
              }`}
            />
            {/* Loading overlay */}
            {(isLoading || (!isCardReady && !initError)) && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading payment form...</span>
                </div>
              </div>
            )}
          </div>
          {cardError && (
            <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {cardError}
            </p>
          )}
        </div>

        {/* Pay Button */}
        <button
          type="button"
          onClick={handleCardPayment}
          disabled={!isCardReady || isProcessing}
          className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Pay {formatCurrency(amountCents / 100)}
            </>
          )}
        </button>
      </div>

      {/* Security Badges */}
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

      {/* Cancel Button */}
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
    </div>
  );
}
