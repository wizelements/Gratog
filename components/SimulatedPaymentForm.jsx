'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Lock, 
  CheckCircle, 
  Loader2, 
  AlertCircle,
  Apple,
  Smartphone,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

export default function SimulatedPaymentForm({ 
  amount, 
  currency = 'USD',
  orderDetails,
  onSuccess,
  onCancel 
}) {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [processing, setProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [errors, setErrors] = useState({});

  // Format card number with spaces
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  // Format expiry MM/YY
  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + (v.length > 2 ? '/' + v.substring(2, 4) : '');
    }
    return v;
  };

  // Validate card number using Luhn algorithm
  const validateCardNumber = (number) => {
    const cleanNumber = number.replace(/\s/g, '');
    if (cleanNumber.length < 13 || cleanNumber.length > 19) return false;
    
    let sum = 0;
    let isEven = false;
    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber.charAt(i), 10);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    return (sum % 10) === 0;
  };

  // Get card brand
  const getCardBrand = (number) => {
    const cleanNumber = number.replace(/\s/g, '');
    if (/^4/.test(cleanNumber)) return 'Visa';
    if (/^5[1-5]/.test(cleanNumber)) return 'Mastercard';
    if (/^3[47]/.test(cleanNumber)) return 'Amex';
    if (/^6(?:011|5)/.test(cleanNumber)) return 'Discover';
    return 'Card';
  };

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.replace(/\s/g, '').length <= 16) {
      setCardNumber(formatted);
      if (errors.cardNumber) {
        setErrors(prev => ({ ...prev, cardNumber: null }));
      }
    }
  };

  const handleExpiryChange = (e) => {
    const formatted = formatExpiry(e.target.value);
    if (formatted.replace('/', '').length <= 4) {
      setExpiry(formatted);
      if (errors.expiry) {
        setErrors(prev => ({ ...prev, expiry: null }));
      }
    }
  };

  const handleCvvChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 4) {
      setCvv(value);
      if (errors.cvv) {
        setErrors(prev => ({ ...prev, cvv: null }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (paymentMethod === 'card') {
      if (!cardholderName.trim()) {
        newErrors.cardholderName = 'Cardholder name is required';
      }
      
      if (!validateCardNumber(cardNumber)) {
        newErrors.cardNumber = 'Invalid card number';
      }
      
      const expiryParts = expiry.split('/');
      if (expiryParts.length !== 2 || expiryParts[0].length !== 2 || expiryParts[1].length !== 2) {
        newErrors.expiry = 'Invalid expiry (MM/YY)';
      } else {
        const month = parseInt(expiryParts[0]);
        const year = parseInt('20' + expiryParts[1]);
        const now = new Date();
        const expDate = new Date(year, month - 1);
        if (month < 1 || month > 12 || expDate < now) {
          newErrors.expiry = 'Card is expired';
        }
      }
      
      if (cvv.length < 3) {
        newErrors.cvv = 'Invalid CVV';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const simulatePayment = async () => {
    if (!validateForm()) {
      toast.error('Please check your payment details');
      return;
    }

    setProcessing(true);
    
    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Simulate random success/failure for realism (95% success rate)
      const success = Math.random() > 0.05;
      
      if (success) {
        setPaymentComplete(true);
        toast.success('Payment processed successfully!');
        
        // Wait a moment then call success callback
        setTimeout(() => {
          if (onSuccess) {
            onSuccess({
              paymentId: `sim_pay_${Date.now()}`,
              status: 'COMPLETED',
              amount,
              currency,
              paymentMethod: paymentMethod === 'card' ? getCardBrand(cardNumber) : paymentMethod,
              last4: cardNumber.replace(/\s/g, '').slice(-4),
              receiptUrl: `#receipt-${Date.now()}`,
              timestamp: new Date().toISOString()
            });
          }
        }, 1500);
      } else {
        throw new Error('Payment declined - Please try another card');
      }
    } catch (error) {
      toast.error(error.message || 'Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  const handleApplePay = async () => {
    setProcessing(true);
    setPaymentMethod('apple_pay');
    
    toast.info('Apple Pay - Simulated Mode');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    setPaymentComplete(true);
    
    setTimeout(() => {
      if (onSuccess) {
        onSuccess({
          paymentId: `sim_applepay_${Date.now()}`,
          status: 'COMPLETED',
          amount,
          currency,
          paymentMethod: 'Apple Pay',
          receiptUrl: `#receipt-${Date.now()}`,
          timestamp: new Date().toISOString()
        });
      }
    }, 1500);
  };

  const handleGooglePay = async () => {
    setProcessing(true);
    setPaymentMethod('google_pay');
    
    toast.info('Google Pay - Simulated Mode');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    setPaymentComplete(true);
    
    setTimeout(() => {
      if (onSuccess) {
        onSuccess({
          paymentId: `sim_googlepay_${Date.now()}`,
          status: 'COMPLETED',
          amount,
          currency,
          paymentMethod: 'Google Pay',
          receiptUrl: `#receipt-${Date.now()}`,
          timestamp: new Date().toISOString()
        });
      }
    }, 1500);
  };

  if (paymentComplete) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-12 pb-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-green-800 mb-3">Payment Successful!</h2>
          <p className="text-gray-600 mb-6">
            Your payment of <span className="font-bold text-green-600">${amount.toFixed(2)}</span> has been processed
          </p>
          
          <Badge className="bg-green-600 text-white mb-6">
            Simulated Mode - Demo Payment
          </Badge>
          
          <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
            <p className="mb-2">✨ This is a simulated payment for demonstration purposes</p>
            <p>No actual charges were made to your payment method</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Payment Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-green-600" />
            Secure Payment
          </CardTitle>
          <CardDescription>
            Your payment information is encrypted and secure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Demo Mode Badge */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-900">Demo Payment Mode</span>
            </div>
            <p className="text-sm text-blue-700">
              This is a simulated payment interface. No actual charges will be made.
              Use test card: <code className="bg-blue-100 px-2 py-1 rounded">4111 1111 1111 1111</code>
            </p>
          </div>

          {/* Digital Wallets */}
          <div className="space-y-3">
            <Label>Quick Pay Options</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleApplePay}
                disabled={processing}
                variant="outline"
                className="h-14 border-2 hover:border-black hover:bg-black hover:text-white transition-all"
                data-testid="apple-pay-button"
              >
                <Apple className="mr-2 h-5 w-5" />
                Apple Pay
              </Button>
              
              <Button
                onClick={handleGooglePay}
                disabled={processing}
                variant="outline"
                className="h-14 border-2 hover:border-blue-600 hover:bg-blue-600 hover:text-white transition-all"
                data-testid="google-pay-button"
              >
                <Smartphone className="mr-2 h-5 w-5" />
                Google Pay
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">Or pay with card</span>
            </div>
          </div>

          {/* Card Payment Form */}
          <div className="space-y-4">
            {/* Cardholder Name */}
            <div className="space-y-2">
              <Label htmlFor="cardholder-name">Cardholder Name</Label>
              <Input
                id="cardholder-name"
                data-testid="cardholder-name-input"
                placeholder="John Doe"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                disabled={processing}
                className={errors.cardholderName ? 'border-red-500' : ''}
              />
              {errors.cardholderName && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.cardholderName}
                </p>
              )}
            </div>

            {/* Card Number */}
            <div className="space-y-2">
              <Label htmlFor="card-number">Card Number</Label>
              <div className="relative">
                <Input
                  id="card-number"
                  data-testid="card-number-input"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  disabled={processing}
                  className={`pl-10 ${errors.cardNumber ? 'border-red-500' : ''}`}
                  maxLength={19}
                />
                <CreditCard className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                {cardNumber.length > 4 && (
                  <Badge className="absolute right-3 top-2.5 bg-blue-600">
                    {getCardBrand(cardNumber)}
                  </Badge>
                )}
              </div>
              {errors.cardNumber && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.cardNumber}
                </p>
              )}
              <p className="text-xs text-gray-500">
                💡 Test card: 4111 1111 1111 1111 (Visa) or 5555 5555 5555 4444 (Mastercard)
              </p>
            </div>

            {/* Expiry and CVV */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  data-testid="card-expiry-input"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={handleExpiryChange}
                  disabled={processing}
                  className={errors.expiry ? 'border-red-500' : ''}
                  maxLength={5}
                />
                {errors.expiry && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.expiry}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  data-testid="card-cvv-input"
                  type="password"
                  placeholder="123"
                  value={cvv}
                  onChange={handleCvvChange}
                  disabled={processing}
                  className={errors.cvv ? 'border-red-500' : ''}
                  maxLength={4}
                />
                {errors.cvv && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.cvv}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Amount to Pay</span>
              <span className="font-bold text-lg text-green-600">${amount.toFixed(2)}</span>
            </div>
            {orderDetails && (
              <div className="text-xs text-gray-500">
                Order #{orderDetails.orderId || 'PENDING'}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={simulatePayment}
              disabled={processing || !cardNumber || !expiry || !cvv || !cardholderName}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold text-lg"
              data-testid="pay-now-button"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-5 w-5" />
                  Pay ${amount.toFixed(2)}
                </>
              )}
            </Button>
            
            {onCancel && (
              <Button
                onClick={onCancel}
                disabled={processing}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            )}
          </div>

          {/* Security Badges */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <Badge variant="outline" className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              256-bit SSL
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              PCI Compliant
            </Badge>
            <Badge variant="outline">
              Powered by Square
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Accepted Payment Methods */}
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-3">Accepted Payment Methods</p>
        <div className="flex justify-center gap-2 flex-wrap">
          {['Visa', 'Mastercard', 'Amex', 'Discover', 'Apple Pay', 'Google Pay'].map(method => (
            <Badge key={method} variant="outline" className="text-xs">
              {method}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
