'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Square Web Payments SDK Component
 * Provides in-page checkout with direct card entry (no redirect to Square)
 * 
 * FIXED: Now uses /api/square/config for consistent SDK configuration
 * FIXED: Passes locationId to Square.payments() as required
 * FIXED: Uses environment-aware SDK URL
 * FIXED: Added squareOrderId prop for order-payment linking
 */
export default function SquareWebPaymentForm({ 
  amountCents, 
  currency = 'USD',
  orderId,
  squareOrderId,
  customer,
  lineItems,
  onPaymentSuccess,
  onPaymentError,
  onProcessingChange
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [config, setConfig] = useState(null);
  const [paymentError, setPaymentError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const paymentsRef = useRef(null);
  const cardRef = useRef(null);
  const abortControllerRef = useRef(null);
  const idempotencyKeyRef = useRef(null);
  
  // Generate stable idempotency key once per order
  useEffect(() => {
    if (orderId && !idempotencyKeyRef.current) {
      idempotencyKeyRef.current = `${orderId}-${customer?.email || 'guest'}-${Date.now()}`;
    }
  }, [orderId, customer?.email]);
  
  // Fetch Square config from API (unified with SquarePaymentForm.tsx)
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/square/config');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load payment configuration');
        }
        const configData = await res.json();
        
        if (!configData.applicationId || !configData.locationId) {
          throw new Error('Missing required Square configuration');
        }
        
        setConfig(configData);
      } catch (e) {
        console.error('Failed to load Square config:', e);
        toast.error(e.message || 'Failed to load payment configuration');
        setIsLoading(false);
        if (onPaymentError) {
          onPaymentError(e);
        }
      }
    };
    
    fetchConfig();
  }, [onPaymentError]);
  
  // Load Square SDK and initialize payment form
  useEffect(() => {
    if (!config) return;
    
    const loadSquareSDK = () => {
      return new Promise((resolve, reject) => {
        if (window.Square) {
          resolve();
          return;
        }
        
        // Check for existing script
        const existingScript = document.querySelector(`script[src="${config.sdkUrl}"]`);
        if (existingScript) {
          if (existingScript.getAttribute('data-loaded') === 'true') {
            resolve();
            return;
          }
          existingScript.addEventListener('load', resolve);
          existingScript.addEventListener('error', () => reject(new Error('Failed to load Square SDK')));
          return;
        }
        
        // Load new script using environment-aware URL
        const script = document.createElement('script');
        script.src = config.sdkUrl;
        script.async = true;
        
        const timeoutId = setTimeout(() => {
          reject(new Error('Square SDK load timeout'));
        }, 15000);
        
        script.onload = () => {
          clearTimeout(timeoutId);
          script.setAttribute('data-loaded', 'true');
          resolve();
        };
        script.onerror = () => {
          clearTimeout(timeoutId);
          reject(new Error('Failed to load Square SDK'));
        };
        
        document.body.appendChild(script);
      });
    };
    
    const initializePaymentForm = async () => {
      try {
        await loadSquareSDK();
        
        if (!window.Square) {
          throw new Error('Square SDK not available');
        }
        
        // FIXED: Pass both applicationId AND locationId as required
        const payments = await window.Square.payments(
          config.applicationId,
          config.locationId
        );
        paymentsRef.current = payments;
        
        // Create card payment form
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
            }
          }
        });
        cardRef.current = card;
        
        // Attach card form to DOM
        await card.attach('#square-card-container');
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing Square payment form:', error);
        toast.error('Failed to initialize payment form');
        setIsLoading(false);
        if (onPaymentError) {
          onPaymentError(error);
        }
      }
    };
    
    initializePaymentForm();
    
    // Cleanup
    return () => {
      if (cardRef.current) {
        try {
          cardRef.current.destroy();
        } catch (e) {
          // FIXED: Was using undefined 'debug' function
          console.warn('Error destroying Square card instance:', e);
        }
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [config, onPaymentError]);
  
  const handlePaymentSubmit = useCallback(async (event) => {
    if (event) event.preventDefault();
    
    if (!cardRef.current) {
      toast.error('Payment form not ready');
      return;
    }
    
    setIsProcessing(true);
    setPaymentError(null);
    if (onProcessingChange) onProcessingChange(true);
    
    // Create abort controller with timeout
    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => {
      abortControllerRef.current?.abort();
    }, 30000); // 30 second timeout
    
    try {
      // Tokenize card details
      const tokenResult = await cardRef.current.tokenize();
      
      if (tokenResult.status === 'OK') {
        const paymentToken = tokenResult.token;
        
        // Send token to backend for payment processing
        const response = await fetch('/api/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sourceId: paymentToken,
            amountCents,
            currency,
            orderId,
            squareOrderId, // FIXED: Now passing squareOrderId for order-payment linking
            customer,
            lineItems,
            idempotencyKey: idempotencyKeyRef.current
          }),
          signal: abortControllerRef.current.signal
        });
        
        clearTimeout(timeoutId);
        const result = await response.json();
        
        // Handle specific Square errors
        if (response.status === 401) {
          throw new Error('Square authentication failed. Please contact support.');
        }
        
        if (response.status === 400) {
          if (result.error?.includes('CARD_DECLINED')) {
            throw new Error('Card declined. Please try a different payment method.');
          }
          if (result.error?.includes('INSUFFICIENT_FUNDS')) {
            throw new Error('Insufficient funds. Please try a different payment method.');
          }
          if (result.error?.includes('INVALID_CARD')) {
            throw new Error('Invalid card details. Please check your information.');
          }
          throw new Error(result.error || 'Payment validation failed');
        }
        
        if (response.status === 409) {
          // Order already paid
          toast.success('This order has already been paid!');
          if (onPaymentSuccess) {
            onPaymentSuccess({
              orderId,
              alreadyPaid: true,
              message: result.error
            });
          }
          return;
        }
        
        if (response.ok && result.success) {
          toast.success('Payment successful!');
          if (onPaymentSuccess) {
            onPaymentSuccess({
              ...result,
              orderId,
              paymentId: result.payment?.id
            });
          }
        } else {
          throw new Error(result.error || result.details || 'Payment failed');
        }
      } else {
        // Handle tokenization errors
        const errors = tokenResult.errors || [];
        const errorMessage = errors.map(e => e.message).join(', ') || 'Card validation failed';
        throw new Error(errorMessage);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle abort/timeout
      if (error.name === 'AbortError') {
        const timeoutError = 'Payment request timed out. Please try again.';
        setPaymentError(timeoutError);
        toast.error(timeoutError);
        if (onPaymentError) {
          onPaymentError(new Error(timeoutError));
        }
        return;
      }
      
      console.error('Payment error:', error);
      const errorMsg = error.message || 'Payment processing failed';
      setPaymentError(errorMsg);
      toast.error(errorMsg);
      if (onPaymentError) {
        onPaymentError(error);
      }
    } finally {
      setIsProcessing(false);
      if (onProcessingChange) onProcessingChange(false);
    }
  }, [amountCents, currency, orderId, squareOrderId, customer, lineItems, onPaymentSuccess, onPaymentError, onProcessingChange]);
  
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setPaymentError(null);
    handlePaymentSubmit();
  };
  
  if (!config && isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-3 text-sm text-gray-600">Loading payment configuration...</span>
      </div>
    );
  }
  
  if (!config) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">
          Payment system is temporarily unavailable. Please try again later or contact support.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Sandbox mode indicator */}
      {config.environment === 'sandbox' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
          <span className="text-amber-600 text-sm">
            <strong>Sandbox Mode</strong> – Use test card: 4532 0155 0016 4662
          </span>
        </div>
      )}
      
      {/* Card Entry Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Payment Information
        </h3>
        
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-3 text-sm text-gray-600">Loading secure payment form...</span>
          </div>
        )}
        
        {/* Square card container - SDK will inject payment form here */}
        <div id="square-card-container" className={isLoading ? 'hidden' : ''}></div>
        
        {/* Payment Error with Retry */}
        {paymentError && !isLoading && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h4 className="font-medium text-red-800">Payment Failed</h4>
                <p className="text-sm text-red-600 mt-1">{paymentError}</p>
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isProcessing}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}
        
        {!isLoading && (
          <div className="mt-6">
            <button
              type="button"
              onClick={handlePaymentSubmit}
              disabled={isProcessing}
              className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all
                ${isProcessing 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95'
                }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing Payment...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  {paymentError ? 'Retry Payment' : 'Pay'} ${(amountCents / 100).toFixed(2)}
                </span>
              )}
            </button>
          </div>
        )}
      </div>
      
      {/* Security Badge */}
      <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span>Secured by Square • Bank-level encryption</span>
      </div>
      
      {/* Accepted Cards */}
      <div className="flex items-center justify-center space-x-3 text-xs text-gray-500 flex-wrap">
        <span className="font-medium">We accept:</span>
        <div className="flex space-x-2 items-center">
          <span className="px-2 py-1 bg-gray-100 rounded">Visa</span>
          <span className="px-2 py-1 bg-gray-100 rounded">Mastercard</span>
          <span className="px-2 py-1 bg-gray-100 rounded">Amex</span>
          <span className="px-2 py-1 bg-gray-100 rounded">Discover</span>
        </div>
      </div>
    </div>
  );
}
