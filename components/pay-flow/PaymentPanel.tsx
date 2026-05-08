/**
 * 🚀 Gratog Pay Flow — Payment Panel
 * Square Web Payments SDK integration
 * Uses existing Square infrastructure
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { CreditCard, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { usePayFlowCart, usePayFlowUI, usePayFlowInventory, usePayFlowMetrics } from '@/lib/pay-flow/store';
import { formatPrice } from '@/lib/pay-flow/data';
import { getPayFlowSquareConfig, getSquareSdkUrl } from '@/lib/pay-flow/square-extension';
import { cn } from '@/lib/utils';

// Square SDK types
declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => Promise<SquarePayments>;
    };
  }
}

interface SquarePayments {
  paymentRequest: (options: PaymentRequestOptions) => PaymentRequest;
  card: () => Promise<SquareCard>;
}

interface PaymentRequestOptions {
  countryCode: string;
  currencyCode: string;
  total: { amount: string; label: string; };
}

interface PaymentRequest {
  tokenize: () => Promise<TokenResult | null>;
}

interface SquareCard {
  attach: (element: HTMLElement) => Promise<void>;
  tokenize: () => Promise<TokenResult | null>;
}

interface TokenResult {
  status: string;
  token?: string;
  details?: { method: string; card?: { brand: string; last4: string; }; };
  errors?: Array<{ message: string; }>;
}

export function PaymentPanel() {
  const { currentView, setView } = usePayFlowUI();
  const { items, calculateTotals, clearCart } = usePayFlowCart();
  const { products } = usePayFlowInventory();
  const { recordPaymentCompleted } = usePayFlowMetrics();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSquareReady, setIsSquareReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const cardInstanceRef = useRef<SquareCard | null>(null);
  const paymentsRef = useRef<SquarePayments | null>(null);
  
  const { totalCents } = calculateTotals(products);
  const isOpen = currentView === 'payment';
  
  // Get Square config
  const squareConfig = getPayFlowSquareConfig();
  
  // Load Square SDK
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    
    const loadSquare = async () => {
      if (window.Square) {
        setIsSquareReady(true);
        return;
      }
      
      const script = document.createElement('script');
      script.src = getSquareSdkUrl();
      script.onload = () => setIsSquareReady(true);
      script.onerror = () => setError('Failed to load payment system');
      document.body.appendChild(script);
    };
    
    loadSquare();
  }, [isOpen]);
  
  // Initialize card payment
  useEffect(() => {
    if (!isSquareReady || !isOpen || !cardContainerRef.current) return;
    
    if (!squareConfig.isConfigured) {
      setError('Square not configured');
      return;
    }
    
    const initCard = async () => {
      try {
        if (!window.Square) {
          setError('Square SDK not available');
          return;
        }
        
        const payments = await window.Square.payments(
          squareConfig.applicationId,
          squareConfig.locationId
        );
        paymentsRef.current = payments;
        
        const card = await payments.card();
        cardInstanceRef.current = card;
        
        await card.attach(cardContainerRef.current);
      } catch (err) {
        console.error('Card initialization error:', err);
        setError('Could not initialize card payment');
      }
    };
    
    initCard();
    
    return () => {
      cardInstanceRef.current = null;
      paymentsRef.current = null;
    };
  }, [isSquareReady, isOpen, squareConfig.isConfigured, squareConfig.applicationId, squareConfig.locationId]);
  
  const handleCardPayment = async () => {
    if (!cardInstanceRef.current) {
      setError('Card payment not ready');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setPaymentStatus('processing');
    
    try {
      const result = await cardInstanceRef.current.tokenize();
      
      if (result?.status === 'OK' && result.token) {
        await processPayment(result.token);
      } else {
        throw new Error(result?.errors?.[0]?.message || 'Card tokenization failed');
      }
    } catch (err) {
      setPaymentStatus('error');
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDigitalWallet = async (type: 'apple-pay' | 'google-pay') => {
    if (!paymentsRef.current) {
      setError('Payment system not ready');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setPaymentStatus('processing');
    
    try {
      const paymentRequest = paymentsRef.current.paymentRequest({
        countryCode: 'US',
        currencyCode: 'USD',
        total: {
          amount: (totalCents / 100).toFixed(2),
          label: 'Gratog Market Order'
        }
      });
      
      const result = await paymentRequest.tokenize();
      
      if (result?.status === 'OK' && result.token) {
        await processPayment(result.token);
      } else {
        throw new Error(result?.errors?.[0]?.message || `${type} payment failed`);
      }
    } catch (err) {
      setPaymentStatus('error');
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  const processPayment = async (sourceId: string) => {
    try {
      // Build items with product details for the API
      const itemsWithDetails = items.map(item => {
        const product = products.find(p => p.id === item.productId);
        return {
          productId: item.productId,
          name: product?.name || item.productId,
          quantity: item.quantity,
          priceCents: product?.priceCents || 0,
          upsellIds: item.upsellIds,
          catalogObjectId: product?.id // Will need real Square catalog IDs
        };
      });
      
      const response = await fetch('/api/pay-flow/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          amountCents: totalCents,
          items: itemsWithDetails
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        recordPaymentCompleted();
        setPaymentStatus('success');
        setTimeout(() => {
          setView('success');
          clearCart();
        }, 1000);
      } else {
        throw new Error(result.error || 'Payment processing failed');
      }
    } catch (err) {
      setPaymentStatus('error');
      throw err;
    }
  };
  
  const handleClose = () => {
    setView('cart');
    setError(null);
    setPaymentStatus('idle');
  };
  
  if (!isOpen) return null;
  
  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={handleClose}
      />
      
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Complete Payment</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            ✕
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Total */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-500 mb-1">Total due</p>
            <p className="text-4xl font-bold text-gray-900">{formatPrice(totalCents)}</p>
          </div>
          
          {/* Digital Wallets */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => handleDigitalWallet('apple-pay')}
              disabled={isLoading || !isSquareReady}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-black text-white rounded-xl font-medium disabled:opacity-50"
            >
              <span> Pay</span>
            </button>
            <button
              onClick={() => handleDigitalWallet('google-pay')}
              disabled={isLoading || !isSquareReady}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-medium disabled:opacity-50"
            >
              <span>G Pay</span>
            </button>
          </div>
          
          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-gray-400">or pay with card</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          
          {/* Card Input */}
          <div 
            ref={cardContainerRef}
            className="min-h-[120px] border-2 border-gray-200 rounded-xl p-4 mb-4"
          >
            {!isSquareReady && (
              <div className="flex items-center justify-center h-full text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading payment system...
              </div>
            )}
          </div>
          
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-700 rounded-xl mb-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          {/* Pay Button */}
          <button
            onClick={handleCardPayment}
            disabled={isLoading || !isSquareReady}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-lg",
              "bg-gray-900 text-white min-h-[56px]",
              "hover:bg-gray-800 active:scale-[0.98] transition-all",
              (isLoading || !isSquareReady) && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : paymentStatus === 'success' ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Success!
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Pay {formatPrice(totalCents)}
              </>
            )}
          </button>
          
          <p className="text-center text-xs text-gray-400 mt-4">
            Your payment is secured by Square. We never store your card details.
          </p>
        </div>
      </div>
    </>
  );
}
