'use client';

import { useState } from 'react';
import { 
  PaymentForm, 
  CreditCard
} from 'react-square-web-payments-sdk';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function SquarePaymentForm({ 
  amount, 
  currency = 'USD', 
  orderId, 
  orderData, 
  onSuccess, 
  onError 
}) {
  const [paymentStatus, setPaymentStatus] = useState({
    loading: false,
    error: null,
    success: false,
    message: ''
  });

  const handlePaymentMethodSubmission = async (token, buyer) => {
    try {
      setPaymentStatus({ 
        loading: true, 
        error: null, 
        success: false, 
        message: 'Processing payment...' 
      });
      
      console.log('Starting payment submission...');
      
      // Generate a unique idempotency key for this payment attempt
      const idempotencyKey = uuidv4();
      
      const paymentData = {
        sourceId: token.token,
        amount,
        currency,
        idempotencyKey,
        orderId,
        buyerDetails: buyer,
        orderData
      };
      
      console.log('Payment data prepared:', { ...paymentData, sourceId: '[REDACTED]' });
      
      // Call the backend API to process payment
      const response = await fetch('/api/square-payment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });
      
      console.log('Payment API response status:', response.status);
      
      // Check if response is ok
      if (!response.ok) {
        console.error('Payment API error response:', response.status, response.statusText);
        throw new Error(`Payment API returned ${response.status}: ${response.statusText}`);
      }
      
      // Check if response has content
      const responseText = await response.text();
      console.log('Payment API response text length:', responseText.length);
      
      if (!responseText || responseText.trim() === '') {
        throw new Error('Payment API returned empty response');
      }
      
      // Parse JSON response
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        console.error('Response text:', responseText);
        throw new Error('Invalid response from payment system. Please try again.');
      }
      
      console.log('Payment result:', result);
      
      if (result.success) {
        setPaymentStatus({
          loading: false,
          error: null,
          success: true,
          message: 'Payment successful!'
        });
        
        // Call success callback if provided
        if (onSuccess) {
          onSuccess(result);
        }
      } else {
        throw new Error(result.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      let errorMessage = 'Payment processing failed. Please try again.';
      
      // Provide specific error messages for common issues
      if (error.message.includes('JSON')) {
        errorMessage = 'Payment system error. Please refresh the page and try again.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Payment processing timed out. Please try again.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setPaymentStatus({
        loading: false,
        error: true,
        success: false,
        message: errorMessage
      });
      
      // Call error callback if provided
      if (onError) {
        onError(error);
      }
    }
  };

  const applicationId = process.env.NEXT_PUBLIC_SQUARE_APP_ID;
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;

  // Don't render if required environment variables are missing
  if (!applicationId || !locationId) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Payment Configuration Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Square payment is not configured properly. Please check your environment variables.
          </p>
          <div className="mt-2 text-xs text-muted-foreground">
            Missing: {!applicationId && 'NEXT_PUBLIC_SQUARE_APP_ID'} {!locationId && 'NEXT_PUBLIC_SQUARE_LOCATION_ID'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="square-payment-form space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Payment Information
            <Badge variant="outline" className="text-xs">Secure</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete your order with Square's secure payment system
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <PaymentForm
            applicationId={applicationId}
            locationId={locationId}
            cardTokenizeResponseReceived={handlePaymentMethodSubmission}
          >
            <div className="payment-methods space-y-3">
              <CreditCard 
                buttonProps={{
                  isLoading: paymentStatus.loading,
                  css: {
                    backgroundColor: '#D4AF37',
                    fontSize: '16px',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%',
                    '&:hover': {
                      backgroundColor: '#B8941F'
                    },
                    '&:disabled': {
                      backgroundColor: '#ccc',
                      cursor: 'not-allowed'
                    }
                  }
                }}
              />
              
              {/* Optional: Add Apple Pay and Google Pay support - commented out for now */}
              {/* 
              <div className="alternative-payments grid grid-cols-1 sm:grid-cols-2 gap-2">
                <ApplePay />
                <GooglePay />
              </div>
              */}
            </div>
          </PaymentForm>
          
          {paymentStatus.message && (
            <div className={`payment-status p-3 rounded-lg text-center ${
              paymentStatus.success 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : paymentStatus.error
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              <div className="flex items-center justify-center gap-2">
                {paymentStatus.loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {paymentStatus.success && <CheckCircle className="h-4 w-4" />}
                {paymentStatus.error && <AlertCircle className="h-4 w-4" />}
                <span className="text-sm font-medium">{paymentStatus.message}</span>
              </div>
            </div>
          )}
          
          <div className="text-xs text-center text-muted-foreground">
            <p>🔒 Your payment information is secure and encrypted</p>
            <p>Powered by Square • Test Mode</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}