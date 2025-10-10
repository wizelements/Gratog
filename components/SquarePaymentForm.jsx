'use client';

import { useState } from 'react';
import { 
  PaymentForm, 
  CreditCard,
  ApplePay,
  GooglePay
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
  const [validationErrors, setValidationErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);

  // Enhanced validation
  const validatePayment = () => {
    const errors = {};
    
    if (!amount || amount <= 0) {
      errors.amount = 'Valid payment amount is required';
    }
    
    if (!orderData?.customer?.email) {
      errors.email = 'Customer email is required';
    }
    
    if (!orderData?.cart?.length) {
      errors.cart = 'Cart cannot be empty';
    }
    
    setValidationErrors(errors);
    setIsFormValid(Object.keys(errors).length === 0);
    return Object.keys(errors).length === 0;
  };

  const handlePaymentMethodSubmission = async (token, buyer) => {
    try {
      // Pre-payment validation
      if (!validatePayment()) {
        throw new Error('Please complete all required fields');
      }

      setPaymentStatus({ 
        loading: true, 
        error: null, 
        success: false, 
        message: 'Securely processing your payment...' 
      });
      
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
            <div className="payment-methods space-y-4">
              {/* Primary Credit Card Payment */}
              <div className="relative">
                <CreditCard 
                  buttonProps={{
                    isLoading: paymentStatus.loading,
                    css: {
                      backgroundColor: paymentStatus.loading ? '#ccc' : '#D4AF37',
                      fontSize: '16px',
                      color: '#fff',
                      borderRadius: '8px',
                      padding: '16px 24px',
                      border: 'none',
                      cursor: paymentStatus.loading ? 'not-allowed' : 'pointer',
                      width: '100%',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      '&:hover': {
                        backgroundColor: paymentStatus.loading ? '#ccc' : '#B8941F',
                        transform: paymentStatus.loading ? 'none' : 'translateY(-2px)',
                        boxShadow: paymentStatus.loading ? 'none' : '0 4px 12px rgba(212, 175, 55, 0.3)'
                      },
                      '&:disabled': {
                        backgroundColor: '#ccc',
                        cursor: 'not-allowed'
                      }
                    }
                  }}
                />
                
                {/* Loading overlay */}
                {paymentStatus.loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-lg">
                    <div className="flex items-center space-x-2 text-white">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm font-medium">Processing...</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Alternative Payment Methods */}
              <div className="alternative-payments space-y-3">
                <div className="flex items-center my-4">
                  <div className="flex-1 border-t border-muted"></div>
                  <span className="px-3 text-sm text-muted-foreground bg-background">or pay with</span>
                  <div className="flex-1 border-t border-muted"></div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Enhanced Apple Pay */}
                  <div className="relative group">
                    <ApplePay 
                      buttonProps={{
                        isLoading: paymentStatus.loading,
                        css: {
                          width: '100%',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: paymentStatus.loading ? 'none' : 'translateY(-1px)',
                            boxShadow: paymentStatus.loading ? 'none' : '0 2px 8px rgba(0,0,0,0.15)'
                          }
                        }
                      }}
                    />
                  </div>
                  
                  {/* Enhanced Google Pay */}
                  <div className="relative group">
                    <GooglePay 
                      buttonProps={{
                        isLoading: paymentStatus.loading,
                        css: {
                          width: '100%',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: paymentStatus.loading ? 'none' : 'translateY(-1px)',
                            boxShadow: paymentStatus.loading ? 'none' : '0 2px 8px rgba(0,0,0,0.15)'
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
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