'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Lock, AlertCircle, RefreshCw, CheckCircle, Package, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CartItem } from '@/adapters/cartAdapter';
import { OrderTotals, formatCurrency } from '@/adapters/totalsAdapter';
import { ContactInfo, FulfillmentData } from '@/stores/checkout';
import Image from 'next/image';
import { useState, useCallback } from 'react';
import { createOrder } from '@/services/order';
import { toast } from 'sonner';
import { track } from '@/utils/analytics';
import SquarePaymentForm from './SquarePaymentForm';
import { useRouter } from 'next/navigation';

interface ReviewAndPayProps {
  cart: CartItem[];
  totals: OrderTotals;
  contact: ContactInfo;
  fulfillment: FulfillmentData;
  tip: number;
  couponCode?: string;
  onBack: () => void;
}

type PaymentStep = 'review' | 'payment' | 'success';

interface PaymentResult {
  paymentId: string;
  status: string;
  receiptUrl?: string;
  cardLast4?: string;
  cardBrand?: string;
}

export default function ReviewAndPay({
  cart,
  totals,
  contact,
  fulfillment,
  tip,
  couponCode,
  onBack
}: ReviewAndPayProps) {
  const router = useRouter();
  const [step, setStep] = useState<PaymentStep>('review');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [squareOrderId, setSquareOrderId] = useState<string | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  
  const handleProceedToPayment = async () => {
    setIsCreatingOrder(true);
    setOrderError(null);
    track('checkout_proceed_to_payment', { fulfillmentType: fulfillment.type });
    
    try {
      const orderResponse = await createOrder(
        contact,
        fulfillment,
        cart,
        tip,
        couponCode
      );
      
      setOrderId(orderResponse.order.id);
      setSquareOrderId(orderResponse.order.squareOrderId);
      setStep('payment');
      track('order_created', { orderId: orderResponse.order.id });
    } catch (error: any) {
      console.error('Order creation error:', error);
      const errorMessage = error.message || 'Failed to create order. Please try again.';
      setOrderError(errorMessage);
      toast.error(errorMessage);
      track('order_creation_failed', { error: error.message });
    } finally {
      setIsCreatingOrder(false);
    }
  };
  
  const handlePaymentSuccess = useCallback((result: PaymentResult) => {
    setPaymentResult(result);
    setStep('success');
    toast.success('Payment successful!');
    track('payment_success', { 
      orderId, 
      paymentId: result.paymentId,
      cardBrand: result.cardBrand 
    });
    
    setTimeout(() => {
      router.push(`/order/${orderId}?success=true`);
    }, 2000);
  }, [orderId, router]);
  
  const handlePaymentError = useCallback((error: string) => {
    toast.error(error);
    track('payment_error', { orderId, error });
  }, [orderId]);
  
  const handleRetryOrder = () => {
    setOrderError(null);
    handleProceedToPayment();
  };

  if (step === 'success' && paymentResult) {
    return (
      <motion.div
        className="text-center py-12 space-y-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Successful!</h2>
          <p className="text-gray-600 mt-2">
            Your order has been confirmed and is being prepared.
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 max-w-sm mx-auto">
          <p className="text-sm text-gray-600">Order ID</p>
          <p className="font-mono font-medium text-gray-900">{orderId}</p>
          {paymentResult.cardLast4 && (
            <p className="text-sm text-gray-500 mt-2">
              Paid with {paymentResult.cardBrand} ending in {paymentResult.cardLast4}
            </p>
          )}
        </div>
        <p className="text-sm text-gray-500">Redirecting to order details...</p>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence mode="wait">
        {step === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Order Summary */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  Order Summary
                </h3>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-100 to-teal-100 flex-shrink-0">
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 truncate">{item.name}</h4>
                        <p className="text-xs text-gray-500">Qty: {item.quantity} • {item.size}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
                
                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatCurrency(totals.subtotal)}</span>
                  </div>
                  {totals.deliveryFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Delivery Fee</span>
                      <span>{formatCurrency(totals.deliveryFee)}</span>
                    </div>
                  )}
                  {totals.tip > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tip</span>
                      <span>{formatCurrency(totals.tip)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span>{formatCurrency(totals.tax)}</span>
                  </div>
                  {totals.couponDiscount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(totals.couponDiscount)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t flex justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-lg font-bold text-emerald-600">
                      {formatCurrency(totals.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Fulfillment Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                {fulfillment.type === 'pickup' ? (
                  <Clock className="w-4 h-4 text-emerald-600" />
                ) : (
                  <MapPin className="w-4 h-4 text-emerald-600" />
                )}
                {fulfillment.type === 'pickup' ? 'Pickup' : fulfillment.type === 'delivery' ? 'Delivery' : 'Shipping'} Details
              </h4>
              <div className="text-sm text-gray-600 space-y-1">
                {fulfillment.type === 'delivery' && fulfillment.delivery && (
                  <>
                    <p>{fulfillment.delivery.address.street}</p>
                    <p>{fulfillment.delivery.address.city}, {fulfillment.delivery.address.state} {fulfillment.delivery.address.zip}</p>
                    <p className="text-emerald-600">Window: {fulfillment.delivery.window}</p>
                  </>
                )}
                {fulfillment.type === 'pickup' && fulfillment.pickup && (
                  <p>{fulfillment.pickup.date?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                )}
              </div>
              <button type="button" onClick={onBack} className="text-sm text-emerald-600 hover:underline mt-3">
                Edit details
              </button>
            </div>

            {/* Contact Info Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
              <div className="text-sm text-gray-600">
                <p>{contact.name}</p>
                <p>{contact.email}</p>
                {contact.phone && <p>{contact.phone}</p>}
              </div>
            </div>
            
            {/* Order Error */}
            {orderError && (
              <motion.div
                className="bg-red-50 border border-red-200 rounded-xl p-4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-800">Order Creation Failed</h4>
                    <p className="text-sm text-red-600 mt-1">{orderError}</p>
                    <Button
                      onClick={handleRetryOrder}
                      variant="outline"
                      size="sm"
                      className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Proceed to Payment Button */}
            <Button
              onClick={handleProceedToPayment}
              disabled={isCreatingOrder}
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              {isCreatingOrder ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Creating Order...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Proceed to Secure Payment
                </div>
              )}
            </Button>
            
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Secure checkout</span>
              </div>
              <span>🔒 Powered by Square</span>
            </div>
          </motion.div>
        )}

        {step === 'payment' && orderId && (
          <motion.div
            key="payment"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Payment Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Secure Payment</h3>
                <p className="text-sm text-gray-500">Order #{orderId.substring(0, 8)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Amount Due</p>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(totals.total)}</p>
              </div>
            </div>

            {/* Square Payment Form */}
            <SquarePaymentForm
              amountCents={Math.round(totals.total * 100)}
              orderId={orderId}
              squareOrderId={squareOrderId || undefined}
              customer={{
                email: contact.email,
                name: contact.name,
                phone: contact.phone
              }}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              onCancel={() => setStep('review')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
