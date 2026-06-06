'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { CreditCard, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/adapters/totalsAdapter';
import type { SquareApplePay, SquareCard, SquareGooglePay } from '@/types/square';

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
  orderAccessToken?: string;
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
  orderAccessToken?: string | null;
  orderAccessTokenExpiresAt?: string | null;
}

type PaymentStep = 'idle' | 'tokenizing' | 'processing' | 'success' | 'error';

export default function SquarePaymentForm({
  amountCents,
  orderId,
  squareOrderId,
  orderAccessToken,
  customer,
  onSuccess,
  onError,
  onCancel
}: SquarePaymentFormProps) {
  const [config, setConfig] = useState<SquareConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCardReady, setIsCardReady] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('idle');
  const [cardError, setCardError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [isApplePayReady, setIsApplePayReady] = useState(false);
  const [isGooglePayReady, setIsGooglePayReady] = useState(false);
  
  const cardRef = useRef<SquareCard | null>(null);
  const applePayRef = useRef<SquareApplePay | null>(null);
  const googlePayRef = useRef<SquareGooglePay | null>(null);
  const initRef = useRef(false);
  
  const idempotencyKey = orderId.slice(0, 36);

  // Fetch Square config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/square/config');
        if (!res.ok) throw new Error('Failed to fetch payment config');
        const data = await res.json();
        if (!data.applicationId || !data.locationId) {
          throw new Error('Invalid payment configuration');
        }
        setConfig(data);
      } catch (err) {
        setInitError(err instanceof Error ? err.message : 'Failed to load payment config');
      }
    };
    fetchConfig();
  }, []);

  // Initialize Square
  useEffect(() => {
    if (!config || initRef.current) return;
    initRef.current = true;
    
    const initSquare = async () => {
      try {
        setIsLoading(true);
        
        // Load Square SDK
        if (!window.Square) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = config.sdkUrl || 'https://web.squarecdn.com/v1/square.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Square SDK'));
            document.head.appendChild(script);
          });
        }
        
        const payments = await window.Square!.payments(config.applicationId, config.locationId);
        const card = await payments.card();
        await card.attach('#square-card-container');
        
        cardRef.current = card;
        setIsCardReady(true);

        const amount = (amountCents / 100).toFixed(2);
        const paymentRequest = payments.paymentRequest({
          countryCode: 'US',
          currencyCode: 'USD',
          total: { amount, label: 'Taste of Gratitude' },
        });

        if (payments.applePay) {
          try {
            const applePay = await payments.applePay(paymentRequest);
            if (applePay) {
              applePayRef.current = applePay;
              setIsApplePayReady(true);
            }
          } catch {
            setIsApplePayReady(false);
          }
        }

        if (payments.googlePay) {
          try {
            const googlePay = await payments.googlePay(paymentRequest);
            if (googlePay) {
              await googlePay.attach('#google-pay-button', {
                buttonColor: 'default',
                buttonType: 'long',
              });
              googlePayRef.current = googlePay;
              setIsGooglePayReady(true);
            }
          } catch {
            setIsGooglePayReady(false);
          }
        }
      } catch (err) {
        setInitError(err instanceof Error ? err.message : 'Failed to initialize payment form');
      } finally {
        setIsLoading(false);
      }
    };
    
    initSquare();
  }, [amountCents, config]);

  const processPaymentToken = useCallback(async (sourceId: string) => {
    setPaymentStep('processing');

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          amountCents,
          orderId,
          squareOrderId,
          orderAccessToken,
          idempotencyKey,
          customer: {
            email: customer.email,
            name: customer.name,
            phone: customer.phone,
          },
        }),
      });
      
      const data = await res.json();
      
      // FIX P2-3: Handle session expiry with restart flow
      if (res.status === 401 && data.code === 'ORDER_ACCESS_TOKEN_EXPIRED') {
        setCardError('Your session expired. Restarting checkout...');
        setTimeout(() => {
          // Clear checkout state and redirect to cart
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('checkout:reset'));
            window.location.href = '/checkout?error=session_expired';
          }
        }, 2000);
        return;
      }
      
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Payment processing failed');
      }

      setPaymentStep('success');
      
      setTimeout(() => {
        onSuccess({
          paymentId: data.payment.id,
          status: data.payment.status,
          receiptUrl: data.payment.receiptUrl,
          cardLast4: data.payment.cardLast4,
          cardBrand: data.payment.cardBrand,
          amountCents: data.payment.amountCents || amountCents,
          orderAccessToken: data.orderAccessToken || null,
          orderAccessTokenExpiresAt: data.orderAccessTokenExpiresAt || null,
        });
      }, 500);
  }, [amountCents, orderId, squareOrderId, orderAccessToken, customer, idempotencyKey, onSuccess]);

  const handleTokenizationError = useCallback((err: unknown, fallback: string) => {
    const errorMsg = err instanceof Error ? err.message : fallback;
    setCardError(errorMsg);
    setPaymentStep('error');
    setTimeout(() => {
      setPaymentStep('idle');
      setCardError(null);
    }, 3000);
    onError(errorMsg);
  }, [onError]);

  const handlePayment = useCallback(async () => {
    if (!cardRef.current || paymentStep !== 'idle') return;

    setPaymentStep('tokenizing');
    setCardError(null);

    try {
      const result = await cardRef.current.tokenize();

      if (result.status !== 'OK' || !result.token) {
        throw new Error(result.errors?.[0]?.message || 'Card tokenization failed');
      }

      await processPaymentToken(result.token);
    } catch (err) {
      handleTokenizationError(err, 'Payment failed');
    }
  }, [paymentStep, processPaymentToken, handleTokenizationError]);

  const handleWalletPayment = useCallback(async (wallet: 'apple' | 'google') => {
    if (paymentStep !== 'idle') return;

    const paymentSource = wallet === 'apple' ? applePayRef.current : googlePayRef.current;
    if (!paymentSource) return;

    setPaymentStep('tokenizing');
    setCardError(null);

    try {
      const result = await paymentSource.tokenize();

      if (result.status !== 'OK' || !result.token) {
        throw new Error(result.errors?.[0]?.message || `${wallet === 'apple' ? 'Apple Pay' : 'Google Pay'} tokenization failed`);
      }

      await processPaymentToken(result.token);
    } catch (err) {
      handleTokenizationError(err, `${wallet === 'apple' ? 'Apple Pay' : 'Google Pay'} payment failed`);
    }
  }, [paymentStep, processPaymentToken, handleTokenizationError]);

  // Error state
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

  const isProcessing = paymentStep === 'tokenizing' || paymentStep === 'processing';

  return (
    <div className="space-y-6">
      {/* Sandbox warning */}
      {config?.environment === 'sandbox' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <strong>Test Mode</strong> - Use card: 4532 0155 0016 4662
          </div>
        </div>
      )}

      {/* Card Form */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        {(isApplePayReady || isGooglePayReady || isLoading) && (
          <div className="mb-6 space-y-3">
            <p className="text-sm font-medium text-gray-700">Express checkout</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {isApplePayReady && (
                <button
                  type="button"
                  onClick={() => handleWalletPayment('apple')}
                  disabled={isProcessing || paymentStep === 'success'}
                  className="min-h-12 rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Apple Pay
                </button>
              )}
              <div
                className={isGooglePayReady ? 'min-h-12' : isLoading ? 'min-h-12 opacity-0 pointer-events-none' : 'hidden'}
                onClick={() => handleWalletPayment('google')}
                aria-disabled={isProcessing || paymentStep === 'success'}
              >
                <div id="google-pay-button" />
              </div>
            </div>
            {(isApplePayReady || isGooglePayReady) && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-gray-500">or pay by card</span>
                </div>
              </div>
            )}
            {!isApplePayReady && !isGooglePayReady && isLoading && (
              <p className="text-xs text-gray-500">Checking wallet availability…</p>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="w-6 h-6 text-gray-600" />
          <h2 className="text-lg font-semibold">Card Payment</h2>
          <div className="ml-auto flex items-center gap-1 text-xs text-gray-500">
            <Lock className="w-3 h-3" />
            <span>Secure</span>
          </div>
        </div>

        {/* Square Card Container */}
        <div id="square-card-container" className="min-h-[200px] mb-4" />

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600" />
            <span className="ml-3 text-gray-600">Loading secure payment...</span>
          </div>
        )}

        {/* Error Message */}
        {cardError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {cardError}
          </div>
        )}

        {/* Success Message */}
        {paymentStep === 'success' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span>Payment successful! Redirecting...</span>
          </div>
        )}

        {/* Pay Button */}
        <button
          onClick={handlePayment}
          disabled={!isCardReady || isProcessing || paymentStep === 'success'}
          className="w-full py-4 bg-gray-900 text-white rounded-lg font-semibold text-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              Processing...
            </span>
          ) : paymentStep === 'success' ? (
            'Payment Complete'
          ) : (
            `Pay ${formatCurrency(amountCents / 100)}`
          )}
        </button>

        {/* Cancel Button */}
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={isProcessing || paymentStep === 'success'}
            className="w-full mt-3 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Security Note */}
      <p className="text-center text-sm text-gray-500">
        Payment is securely processed by Square.
      </p>
    </div>
  );
}
