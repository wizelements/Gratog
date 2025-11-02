'use client';

import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Square Web Payments SDK Component
 * Provides in-page checkout with direct card entry (no redirect to Square)
 * 
 * Requirements:
 * 1. NEXT_PUBLIC_SQUARE_APPLICATION_ID must be set in environment variables
 * 2. Square OAuth permissions must be enabled (PAYMENTS_WRITE, PAYMENTS_READ)
 * 3. HTTPS required (localhost works for development)
 */
export default function SquareWebPaymentForm({ 
  amountCents, 
  currency = 'USD',
  orderId,
  customer,
  lineItems,
  onPaymentSuccess,
  onPaymentError,
  onProcessingChange
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  
  const paymentsRef = useRef(null);
  const cardRef = useRef(null);
  
  const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
  
  useEffect(() => {
    // Load Square Web Payments SDK
    const loadSquareSDK = () => {
      if (window.Square) {
        setSdkLoaded(true);
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://web.squarecdn.com/v1/square.js';
      script.async = true;
      script.onload = () => {
        setSdkLoaded(true);
      };
      script.onerror = () => {
        toast.error('Failed to load Square payment form');
        setIsLoading(false);
      };
      
      document.body.appendChild(script);
    };
    
    loadSquareSDK();
  }, []);
  
  useEffect(() => {
    if (!sdkLoaded || !applicationId) return;
    
    const initializePaymentForm = async () => {
      try {
        // Initialize Square Payments SDK
        const payments = window.Square.payments(applicationId);
        paymentsRef.current = payments;
        
        // Create card payment form
        const card = await payments.card();
        cardRef.current = card;
        
        // Attach card form to DOM
        await card.attach('#square-card-container');
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing Square payment form:', error);
        toast.error('Failed to initialize payment form');
        setIsLoading(false);
      }
    };
    
    initializePaymentForm();
    
    // Cleanup
    return () => {
      if (cardRef.current) {
        try {
          cardRef.current.destroy();
        } catch (e) {
          console.log('Error destroying card:', e);
        }
      }
    };
  }, [sdkLoaded, applicationId]);
  
  const handlePaymentSubmit = async (event) => {
    event.preventDefault();
    
    if (!cardRef.current) {
      toast.error('Payment form not ready');
      return;
    }
    
    setIsProcessing(true);
    if (onProcessingChange) onProcessingChange(true);
    
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
            customer,
            lineItems,
            idempotencyKey: `${orderId}-${customer.email || 'guest'}-v1`
          })
        });
        
        const result = await response.json();
        
        // Handle specific Square errors
        if (response.status === 401) {
          throw new Error('Square authentication failed. Please contact support. (Error: OAuth permissions not enabled)');
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
      console.error('Payment error:', error);
      const errorMsg = error.message || 'Payment processing failed';
      toast.error(errorMsg);
      if (onPaymentError) {
        onPaymentError(error);
      }
    } finally {
      setIsProcessing(false);
      if (onProcessingChange) onProcessingChange(false);
    }
  };
  
  if (!applicationId) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">
          Square Application ID not configured. Please set NEXT_PUBLIC_SQUARE_APPLICATION_ID in environment variables.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
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
        
        {!isLoading && (
          <div className="mt-6">
            <button
              onClick={handlePaymentSubmit}
              disabled={isProcessing}
              className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all
                ${isProcessing 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-[#D4AF37] hover:bg-[#B8941F] active:scale-95'
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
                  Pay ${(amountCents / 100).toFixed(2)}
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
