'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, CreditCard, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { createLogger } from '@/lib/logger';

const logger = createLogger('SquarePaymentForm');

export default function SquarePaymentForm({ orderId, orderTotal, squareOrderId, onPaymentSuccess }) {
  const [paymentStatus, setPaymentStatus] = useState('initializing');
  const [errorMessage, setErrorMessage] = useState('');
  const [card, setCard] = useState(null);
  const hasInitialized = useRef(false); // Prevent double initialization

  useEffect(() => {
    if (hasInitialized.current) {
      logger.debug('Already initialized, skipping');
      return;
    }
    
    hasInitialized.current = true;
    logger.info('SquarePaymentForm mounted - starting initialization');
    initializeSquare();
  }, []);

  const initializeSquare = async () => {
    let attempts = 0;
    const maxAttempts = 20;
    let isInitialized = false; // Prevent double initialization
    
    const tryInit = async () => {
      if (isInitialized) {
        logger.debug('Already initialized, skipping');
        return;
      }
      
      attempts++;
      logger.debug(`Init attempt ${attempts}/${maxAttempts}`);

      // Check if DOM element exists
      const container = document.getElementById('square-card-container');
      if (!container) {
        logger.debug('DOM container not found yet');
        if (attempts < maxAttempts) {
          setTimeout(tryInit, 300);
        } else {
          setPaymentStatus('error');
          setErrorMessage('Payment form failed to load');
        }
        return;
      }

      // Check if Square.js loaded
      if (!window.Square) {
        logger.debug('Square.js not loaded yet');
        if (attempts < maxAttempts) {
          setTimeout(tryInit, 300);
        } else {
          setPaymentStatus('error');
          setErrorMessage('Square SDK failed to load. Please refresh.');
        }
        return;
      }

      // Everything ready - initialize!
      try {
        const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
        const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;
        
        if (!appId || !locationId) {
          throw new Error('Square not configured');
        }

        // Clear container to prevent duplicates
        container.innerHTML = '';
        
        logger.info('Initializing Square SDK', { appId: appId.substring(0, 10) + '...', locationId });
        const payments = window.Square.payments(appId, locationId);
        
        logger.info('Creating card element');
        const cardInstance = await payments.card();
        
        logger.info('Attaching to container');
        await cardInstance.attach('#square-card-container');
        
        isInitialized = true; // Mark as initialized
        setCard(cardInstance);
        setPaymentStatus('idle');
        logger.info('✅ Square Payment Form initialized successfully!');
        
      } catch (error) {
        logger.error('Square init error', { error: error.message, stack: error.stack });
        setPaymentStatus('error');
        setErrorMessage(error.message);
        toast.error('Payment form error: ' + error.message);
      }
    };

    tryInit();
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    if (!card) {
      toast.error('Payment form not ready');
      return;
    }

    setPaymentStatus('processing');
    setErrorMessage('');
    logger.info('Processing payment', { orderId, amountCents: Math.round(orderTotal * 100) });

    try {
      const result = await card.tokenize();
      
      if (result.status === 'OK' && result.token) {
        logger.info('Card tokenized, calling payment API');
        
        const response = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceId: result.token,
            amountCents: Math.round(orderTotal * 100),
            orderId,
            squareOrderId,
            note: `Order #${orderId}`
          })
        });

        const data = await response.json();

        if (data.success) {
          logger.info('✅ Payment successful!');
          setPaymentStatus('success');
          toast.success('Payment successful! 🎉');
          if (onPaymentSuccess) onPaymentSuccess(data);
        } else {
          throw new Error(data.error || 'Payment failed');
        }
      } else {
        throw new Error(result.errors?.[0]?.message || 'Card error');
      }
    } catch (error) {
      logger.error('Payment error', { error: error.message });
      setPaymentStatus('idle'); // Allow retry
      setErrorMessage(error.message);
      toast.error(error.message);
    }
  };

  if (paymentStatus === 'success') {
    return (
      <Card className="border-green-200 bg-green-50 shadow-xl">
        <CardContent className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6 animate-bounce">
            <CheckCircle className="w-16 h-16 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-green-900 mb-3">Payment Successful!</h2>
          <p className="text-green-700 text-lg mb-4">Your payment has been processed.</p>
          <Badge className="bg-green-600 text-white text-xl px-6 py-2">
            ${orderTotal.toFixed(2)} Paid
          </Badge>
        </CardContent>
      </Card>
    );
  }

  if (paymentStatus === 'error' && !card) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-900">Payment Form Error</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to Load Payment Form</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
          <Button onClick={() => window.location.reload()} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh Page
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-2 border-emerald-100">
      <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <CardTitle className="text-2xl flex items-center gap-3">
          <CreditCard className="w-7 h-7" />
          Secure Card Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        {paymentStatus === 'initializing' && (
          <div className="text-center py-12">
            <Loader2 className="w-16 h-16 mx-auto mb-6 animate-spin text-emerald-600" />
            <p className="text-lg text-gray-700 font-medium mb-2">Loading secure payment form...</p>
            <p className="text-sm text-gray-500">Initializing Square Web Payments SDK</p>
          </div>
        )}

        {errorMessage && paymentStatus === 'idle' && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Payment Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* ALWAYS render the container div, just hide it during initialization */}
        <div className={paymentStatus === 'initializing' ? 'hidden' : 'block'}>
          <div className="mb-8">
            <div className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-lg text-gray-700 font-semibold">Order Total:</span>
                <span className="text-4xl font-bold text-emerald-600">
                  ${orderTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <Label className="block mb-3 text-base font-semibold">Card Information</Label>
            <div 
              id="square-card-container"
              className="min-h-[140px] p-5 border-2 border-gray-300 rounded-xl bg-white focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100 transition-all"
            />
            
            <div className="flex items-center justify-center gap-3 text-sm text-gray-500 mt-4">
              <CreditCard className="w-4 h-4" />
              <span className="font-medium">We accept Visa, Mastercard, Amex, and Discover</span>
            </div>
          </div>

          <Button
            onClick={handlePayment}
            disabled={paymentStatus !== 'idle'}
            className="w-full h-16 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-xl font-bold shadow-2xl hover:shadow-emerald-300/50 transition-all transform hover:scale-[1.02]"
          >
            {paymentStatus === 'processing' ? (
              <>
                <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                Processing Your Payment...
              </>
            ) : (
              <>
                <CreditCard className="w-6 h-6 mr-3" />
                Pay ${orderTotal.toFixed(2)} Securely
              </>
            )}
          </Button>

          <div className="mt-6 space-y-2 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <span className="inline-flex items-center gap-2 font-medium">
                🔒 Your payment is <strong className="text-emerald-600">encrypted and secure</strong>
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Card information is never stored on our servers
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
