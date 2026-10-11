'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { CreditCard, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/adapters/totalsAdapter';
import type { SquareApplePay, SquareCard, SquareCashAppPay, SquareGooglePay } from '@/types/square';

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
  const [isCashAppPayReady, setIsCashAppPayReady] = useState(false);
  
  const cardRef = useRef<SquareCard | null>(null);
  const applePayRef = useRef<SquareApplePay | null>(null);
  const googlePayRef = useRef<SquareGooglePay | null>(null);
  const cashAppPayRef = useRef<SquareCashAppPay | null>(null);
  const initRef = useRef(false);
  const submittingRef = useRef(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  
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

        if (payments.cashAppPay && typeof window !== 'undefined') {
          try {
            const cashAppPay = await payments.cashAppPay(paymentRequest, {
              redirectURL: window.location.href,
              referenceId: orderId.slice(0, 36),
            });

            if (cashAppPay) {
              cashAppPay.addEventListener('ontokenization', async (event) => {
                const tokenResult = event.detail?.tokenResult;
                const tokenStatus = tokenResult?.status;

                if (event.detail?.error) {
                  handleTokenizationError(event.detail.error, event.detail.error.message || 'Cash App Pay failed');
                  return;
                }

                if (tokenStatus === 'Cancel') {
                  setPaymentStep('idle');
                  setCardError(null);
                  return;
                }

                if (tokenStatus !== 'OK' || !tokenResult?.token) {
                  handleTokenizationError(tokenResult?.errors?.[0]?.message, 'Cash App Pay tokenization failed');
                  return;
                }

                await processPaymentToken(tokenResult.token);
              });
              await cashAppPay.attach('#cash-app-pay-button');
              cashAppPayRef.current = cashAppPay;
              setIsCashAppPayReady(true);
            }
          } catch {
            setIsCashAppPayReady(false);
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
    if (submittingRef.current || paymentStep === 'processing' || paymentStep === 'success') return;
    submittingRef.current = true;
    let definitiveDecline = false;
    setPaymentStep('processing');
    try {
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
        // This response came from Square as a definitive card/wallet decline.
        // An uncertain 5xx or network failure must NOT enable another charge.
        definitiveDecline = res.status === 400 && Boolean(data.code);
        throw new Error(data.error || 'Payment processing failed');
      }

      if (!data.payment?.id || data.payment.status !== 'COMPLETED') {
        throw new Error('Your payment has not been confirmed. Please check your order status before trying again.');
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
    } catch (error) {
      // Also covers asynchronous Cash App callbacks, not just card tokenization.
      const message = error instanceof Error ? error.message : 'Payment status could not be confirmed';
      setCardError(message);
      setPaymentStep(definitiveDecline ? 'idle' : 'error');
      if (definitiveDecline) submittingRef.current = false;
      onError(message);
      // Do not silently return to idle after an ambiguous processor failure:
      // retrying a payment before reconciliation can result in double charges.
    }
  }, [amountCents, orderId, squareOrderId, orderAccessToken, customer, idempotencyKey, onSuccess, onError, paymentStep]);

  const checkPaymentStatus = async () => {
    if (!orderAccessToken || checkingStatus) return;
    setCheckingStatus(true);
    try {
      const query = new URLSearchParams({ orderId, token: orderAccessToken });
      const response = await fetch(`/api/payments?${query.toString()}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error('Unable to verify payment status right now.');
      if (data.payment?.status === 'COMPLETED' && data.payment?.id) {
        setPaymentStep('success');
        onSuccess({
          paymentId: data.payment.id,
          status: 'COMPLETED',
          amountCents: data.payment.amountCents,
          receiptUrl: data.payment.receiptUrl,
          cardBrand: data.payment.cardBrand,
          cardLast4: data.payment.cardLast4,
          orderAccessToken,
        });
        return;
      }
      setCardError('Payment has not been confirmed. Do not pay again until the order is reconciled with support.');
    } catch {
      setCardError('Could not verify payment. Please contact us with your order reference before trying again.');
    } finally {
      setCheckingStatus(false);
    }
  };

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
        {(isApplePayReady || isGooglePayReady || isCashAppPayReady || isLoading) && (
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
              <div
                className={isCashAppPayReady ? 'min-h-12 sm:col-span-2' : isLoading ? 'min-h-12 opacity-0 pointer-events-none' : 'hidden'}
                aria-disabled={isProcessing || paymentStep === 'success'}
              >
                <div id="cash-app-pay-button" />
              </div>
            </div>
            {(isApplePayReady || isGooglePayReady || isCashAppPayReady) && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-gray-500">or pay by card</span>
                </div>
              </div>
            )}
            {!isApplePayReady && !isGooglePayReady && !isCashAppPayReady && isLoading && (
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

        {paymentStep === 'error' && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="mb-3">Your payment result is uncertain. Do not attempt another charge until its status is checked.</p>
            <button
              type="button"
              disabled={!orderAccessToken || checkingStatus}
              onClick={checkPaymentStatus}
              className="min-h-11 rounded-lg border border-amber-700 px-4 font-semibold hover:bg-amber-100 disabled:opacity-50"
            >
              {checkingStatus ? 'Checking…' : 'Check payment status'}
            </button>
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
          disabled={!isCardReady || isProcessing || paymentStep === 'success' || paymentStep === 'error'}
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
        Payment is securely processed by Square. Apple Pay, Google Pay, and Cash App Pay appear when supported by your device, browser, and Square account.
      </p>
    </div>
  );
}
