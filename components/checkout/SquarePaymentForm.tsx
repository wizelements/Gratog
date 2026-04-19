'use client';

/**
 * SquarePaymentForm - Production-hardened payment form with progress feedback
 * 
 * 🎯 CONVERSION PSYCHOLOGY: Eliminate payment anxiety with clear progress steps
 * Users fear the "black box" of payment processing - show them what's happening
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { CreditCard, Lock, AlertCircle, CheckCircle, Shield } from 'lucide-react';
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

interface StepConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const STEP_CONFIG: Record<Exclude<PaymentStep, 'idle' | 'error'>, StepConfig> = {
  tokenizing: {
    icon: <Shield className="w-5 h-5" />,
    title: 'Securing your card...',
    description: 'Encrypting your payment information'
  },
  processing: {
    icon: <CreditCard className="w-5 h-5" />,
    title: 'Processing payment...',
    description: 'Connecting to your bank'
  },
  success: {
    icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
    title: 'Payment confirmed!',
    description: 'Redirecting to your order...'
  }
};

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
  const [progress, setProgress] = useState(0);
  
  const cardRef = useRef<SquareCard | null>(null);
  const initRef = useRef(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Stable idempotency key per order (prevents duplicate charges)
  const idempotencyKey = orderId.slice(0, 36);

  // 🎯 CONVERSION PSYCHOLOGY: Progress animation reduces perceived wait time
  const startProgressAnimation = useCallback((targetProgress: number, duration: number = 2000) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    const startProgress = progress;
    const increment = (targetProgress - startProgress) / (duration / 50);
    
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        const next = prev + increment;
        if (next >= targetProgress) {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
          return targetProgress;
        }
        return next;
      });
    }, 50);
  }, [progress]);

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
        console.error('[Square] Config error:', err);
        setInitError('Payment system temporarily unavailable');
        onError('Payment system unavailable. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, [onError]);

  // Initialize Square SDK
  useEffect(() => {
    if (!config || initRef.current) return;
    initRef.current = true;

    let isMounted = true;

    const initializePayments = async () => {
      try {
        if (!window.Square) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = config.sdkUrl || 'https://web.squarecdn.com/v1/square.js';
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load Square SDK'));
            document.body.appendChild(script);
          });
        }

        if (!isMounted) return;

        const payments = window.Square.payments(config.applicationId, config.locationId);
        
        const cardOptions: SquareCardOptions = {
          style: {
            input: {
              backgroundColor: '#ffffff',
              color: '#1f2937',
              fontSize: '16px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            },
            '.input-container': {
              borderColor: '#d1d5db',
              borderRadius: '8px',
              borderWidth: '1px',
            },
            '.input-container.is-focus': {
              borderColor: '#10b981',
            },
            '.input-container.is-error': {
              borderColor: '#ef4444',
            }
          }
        };

        const card = await payments.card(cardOptions);
        
        const cardContainer = document.getElementById('card-container');
        if (!cardContainer) throw new Error('Card container not found');

        await card.attach('#card-container');

        card.addEventListener('cardBrandChanged', () => setCardError(null));
        card.addEventListener('errorClassAdded', () => setCardError('Please check your card details'));
        card.addEventListener('errorClassRemoved', () => setCardError(null));
        card.addEventListener('focusClassAdded', () => setCardError(null));

        cardRef.current = card;
        setIsCardReady(true);
      } catch (err) {
        console.error('[Square] Initialization failed:', err);
        setInitError('Could not initialize payment form');
        onError('Payment form error. Please refresh and try again.');
      }
    };

    setTimeout(initializePayments, 100);

    return () => {
      isMounted = false;
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
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
        orderAccessToken,
        customer,
        idempotencyKey
      })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Payment processing failed');
    }

    return {
      paymentId: data.payment.id,
      status: data.payment.status,
      receiptUrl: data.payment.receiptUrl,
      cardLast4: data.payment.cardLast4,
      cardBrand: data.payment.cardBrand,
      amountCents: data.payment.amountCents || amountCents,
      orderAccessToken: data.orderAccessToken || null,
      orderAccessTokenExpiresAt: data.orderAccessTokenExpiresAt || null,
    };
  }, [amountCents, orderId, squareOrderId, orderAccessToken, customer, idempotencyKey]);

  const handleCardPayment = useCallback(async () => {
    if (!cardRef.current || paymentStep !== 'idle') return;

    setPaymentStep('tokenizing');
    setCardError(null);
    startProgressAnimation(33, 1500);

    try {
      // Step 1: Tokenize (3-5 seconds typically)
      const result = await cardRef.current.tokenize();

      if (result.status !== 'OK' || !result.token) {
        const errorMsg = result.errors?.[0]?.message || 'Please check your card details';
        setCardError(errorMsg);
        setPaymentStep('idle');
        setProgress(0);
        return;
      }

      // Step 2: Process payment
      setPaymentStep('processing');
      startProgressAnimation(90, 2000);

      const paymentResult = await processPayment(result.token);
      
      // Step 3: Success
      setProgress(100);
      setPaymentStep('success');
      
      // Small delay to show success state before redirect
      setTimeout(() => {
        onSuccess(paymentResult);
      }, 800);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Payment failed';
      setCardError(errorMsg);
      setPaymentStep('error');
      setProgress(0);
      onError(errorMsg);
      
      // Reset to idle after showing error
      setTimeout(() => {
        setPaymentStep('idle');
        setCardError(null);
      }, 3000);
    }
  }, [paymentStep, processPayment, onSuccess, onError, startProgressAnimation]);

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
              } ${isProcessing ? 'opacity-50' : ''}`}
            />
            
            {/* Loading overlay */}
            {(isLoading || (!isCardReady && !initError)) && (
              <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded-lg">
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Loading secure form...</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Card error */}
          <AnimatePresence>
            {cardError && paymentStep === 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-2 flex items-center gap-2 text-sm text-red-600"
              >
                <AlertCircle className="w-4 h-4" />
                {cardError}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 🎯 CONVERSION PSYCHOLOGY: Progress indicator with steps */}
        <AnimatePresence mode="wait">
          {isProcessing && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-emerald-50 rounded-lg p-4 space-y-3"
            >
              {/* Progress bar */}
              <div className="relative h-2 bg-emerald-200 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-emerald-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              
              {/* Step indicator */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0"
                >
                  <motion.div
                    animate={{ rotate: paymentStep === 'tokenizing' ? 360 : 0 }}
                    transition={{ duration: 2, repeat: paymentStep === 'tokenizing' ? Infinity : 0, ease: 'linear' }}
                  >
                    {STEP_CONFIG[paymentStep]?.icon || <CreditCard className="w-4 h-4 text-emerald-600" />}
                  </motion.div>
                </div>
                <div>
                  <p className="font-medium text-emerald-800">
                    {STEP_CONFIG[paymentStep]?.title || 'Processing...'}
                  </p>
                  <p className="text-sm text-emerald-600">
                    {STEP_CONFIG[paymentStep]?.description || 'Please wait...'}
                  </p>
                </div>
              </div>
              
              {/* Security badges */}
              <div className="flex items-center gap-4 text-xs text-emerald-700 pt-2 border-t border-emerald-200">
                <div className="flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>256-bit encryption</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  <span>PCI compliant</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success state */}
        <AnimatePresence>
          {paymentStep === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center"
            >
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="font-semibold text-emerald-800">Payment confirmed!</p>
              <p className="text-sm text-emerald-600">Redirecting to your order...\u003c/p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error state */}
        <AnimatePresence>
          {paymentStep === 'error' && cardError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-red-50 border border-red-200 rounded-lg p-4 text-center"
            >
              <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <p className="text-red-700 font-medium">{cardError}\u003c/p>
              <p className="text-sm text-red-600 mt-1">Please check your details and try again\u003c/p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex gap-3">
          {onCancel && paymentStep === 'idle' && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1"
            >
              Back
            </Button>
          )}
          
          <Button
            type="button"
            onClick={handleCardPayment}
            disabled={!isCardReady || isProcessing}
            className={`flex-1 h-12 text-base font-semibold transition-all ${
              paymentStep === 'success'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
            }`}
          >
            {paymentStep === 'idle' && (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Pay {formatCurrency(amountCents / 100)}
              </>
            )}
            {paymentStep === 'tokenizing' && 'Securing...'}
            {paymentStep === 'processing' && 'Processing...'}
            {paymentStep === 'success' && 'Confirmed!'}
            {paymentStep === 'error' && 'Try Again'}
          </Button>
        </div>

        {/* Security footer */}
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500 pt-2">
          <div className="flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Secure SSL</span>
          </div>
          <span>•\u003c/span>
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>PCI Compliant</span>
          </div>
          <span>•\u003c/span>
          <span>🔒 Square\u003c/span>
        </div>
      </div>
    </div>
  );
}

// Button component (local to avoid import issues)
function Button({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}: { 
  children: React.ReactNode; 
  variant?: 'primary' | 'outline'; 
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg px-4 py-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50'
  };
  
  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
