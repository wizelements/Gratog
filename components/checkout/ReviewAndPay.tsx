'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Lock, AlertCircle, RefreshCw, CheckCircle, Package, MapPin, Clock, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CartItem } from '@/adapters/cartAdapter';
import { OrderTotals, formatCurrency } from '@/adapters/totalsAdapter';
import { ContactInfo, FulfillmentData } from '@/stores/checkout';
import Image from 'next/image';
import { useState, useCallback, useMemo } from 'react';
import { createOrder, OrderCreationError } from '@/services/order';
import { toast } from 'sonner';
import { track } from '@/utils/analytics';
import SquarePaymentForm from './SquarePaymentForm';
import { useRouter } from 'next/navigation';
import { addOrderToQueue, shouldUseQueue, getQueueRedirectUrl } from '@/lib/queue-integration';
import { validateCartForFulfillment, validatePreorderMinimum } from '@/lib/cart-engine';
import { Fulfillment } from '@/adapters/fulfillmentAdapter';

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

type FulfillmentReadiness =
  | { valid: true }
  | { valid: false; code: string; error: string };

interface PaymentResult {
  paymentId: string;
  status: string;
  receiptUrl?: string;
  cardLast4?: string;
  cardBrand?: string;
  orderAccessToken?: string | null;
  orderAccessTokenExpiresAt?: string | null;
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
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [orderAccessToken, setOrderAccessToken] = useState<string | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const hasPreorderItems = useMemo(() => cart.some((item) => item.isPreorder), [cart]);
  const pickupLocation = useMemo(() => {
    if (!fulfillment.pickup?.locationId) return null;
    return Fulfillment.pickupLocations().find((location) => location.id === fulfillment.pickup?.locationId) || null;
  }, [fulfillment.pickup?.locationId]);
  
  const validationResult = useMemo(() => {
    const marketId = fulfillment.pickup?.locationId || fulfillment.type;
    const fulfillmentCheck = validateCartForFulfillment(cart as any, fulfillment.type, marketId);
    if (!fulfillmentCheck.valid) return fulfillmentCheck;
    
    const preorderCheck = validatePreorderMinimum(cart);
    if (!preorderCheck.valid) return preorderCheck;
    
    return fulfillmentCheck;
  }, [cart, fulfillment]);

  const fulfillmentReadiness = useMemo<FulfillmentReadiness>(() => {
    if (hasPreorderItems && fulfillment.type !== 'pickup') {
      return {
        valid: false,
        code: 'PREORDER_PICKUP_REQUIRED',
        error: 'Preorder items must be picked up at a selected market.',
      };
    }

    if (fulfillment.type === 'pickup') {
      if (!fulfillment.pickup?.locationId) {
        return {
          valid: false,
          code: 'PICKUP_LOCATION_REQUIRED',
          error: 'Choose a pickup market before payment.',
        };
      }

      if (!fulfillment.pickup?.date) {
        return {
          valid: false,
          code: 'PICKUP_DATE_REQUIRED',
          error: 'Choose a pickup date before payment.',
        };
      }
    }

    if (fulfillment.type === 'delivery') {
      const address = fulfillment.delivery?.address;
      const hasAddress = Boolean(address?.street && address?.city && address?.state && address?.zip);
      const hasQuote = Number.isFinite(Number(fulfillment.delivery?.fee))
        && Number.isFinite(Number(fulfillment.delivery?.quotedSubtotal));

      if (!hasAddress || !fulfillment.delivery?.window) {
        return {
          valid: false,
          code: 'DELIVERY_DETAILS_REQUIRED',
          error: 'Complete the delivery address and window before payment.',
        };
      }

      if (!hasQuote) {
        return {
          valid: false,
          code: 'DELIVERY_QUOTE_REQUIRED',
          error: 'Confirm the delivery quote before payment.',
        };
      }
    }

    return { valid: true };
  }, [
    hasPreorderItems,
    fulfillment.type,
    fulfillment.pickup?.locationId,
    fulfillment.pickup?.date,
    fulfillment.delivery?.address,
    fulfillment.delivery?.window,
    fulfillment.delivery?.fee,
    fulfillment.delivery?.quotedSubtotal,
  ]);

  const canProceedToPayment = validationResult.valid && fulfillmentReadiness.valid;
  
  const handleProceedToPayment = async () => {
    // Pre-validate before API call
    if (!validationResult.valid) {
      setOrderError(validationResult.error || 'Cart validation failed');
      toast.error(validationResult.error || 'Please check your cart');
      track('checkout_validation_failed', { 
        error: validationResult.error,
        code: validationResult.code 
      });
      return;
    }

    if (!fulfillmentReadiness.valid) {
      setOrderError(fulfillmentReadiness.error);
      toast.error(fulfillmentReadiness.error);
      track('checkout_fulfillment_incomplete', {
        error: fulfillmentReadiness.error,
        code: fulfillmentReadiness.code,
      });
      return;
    }
    
    setIsCreatingOrder(true);
    setOrderError(null);
    track('checkout_proceed_to_payment', { fulfillmentType: fulfillment.type });
    
    try {
      // Pass couponDiscount (in dollars) so backend calculates correct total
      const orderResponse = await createOrder(
        contact,
        fulfillment,
        cart,
        tip,
        couponCode,
        totals.couponDiscount, // couponDiscount is already in dollars from totalsAdapter
        totals.deliveryFee
      );
      
      setOrderId(orderResponse.order.id);
      // @ts-expect-error — type mismatch
      setSquareOrderId(orderResponse.order.squareOrderId);
      setOrderAccessToken(orderResponse.order.orderAccessToken ?? null);
      // Use server-authoritative pricing for payment (prevents amount mismatch)
      if (orderResponse.order.pricing?.total) {
        setServerTotal(orderResponse.order.pricing.total);
      }
      setStep('payment');
      track('order_created', { orderId: orderResponse.order.id });
    } catch (error) {
      console.error('Order creation error:', error);
      
      let errorMessage = 'Failed to create order. Please try again.';
      let errorCode = 'UNKNOWN';
      
      if (error instanceof OrderCreationError) {
        errorMessage = error.message;
        errorCode = error.code;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setOrderError(errorMessage);
      toast.error(errorMessage);
      track('order_creation_failed', { error: errorMessage, code: errorCode });
    } finally {
      setIsCreatingOrder(false);
    }
  };
  
  const handlePaymentSuccess = useCallback(async (result: PaymentResult) => {
    setPaymentResult(result);
    setStep('success');
    toast.success('Payment successful!');
    track('payment_success', { 
      orderId, 
      paymentId: result.paymentId,
      cardBrand: result.cardBrand 
    });
    
    setTimeout(async () => {
      if (!orderId) {
        router.push('/order/success?paid=true');
        return;
      }

      // 🎯 CONVERSION PSYCHOLOGY: Market pickup → Live queue (immediate gratification loop)
      // This creates a dopamine hit: pay → see position → anticipation builds
      const isMarketPickup = shouldUseQueue(fulfillment.type, { 
        marketId: fulfillment.pickup?.locationId 
      });
      
      if (isMarketPickup) {
        try {
          // Add to queue silently - user doesn't need to wait for this
          const queueResult = await addOrderToQueue({
            id: orderId,
            orderRef: orderId.slice(-6).toUpperCase(),
            marketId: fulfillment.pickup?.locationId || 'unknown',
            marketName: fulfillment.pickup?.locationId?.includes('serenbe') ? 'Serenbe Farmers Market' : 
                        fulfillment.pickup?.locationId?.includes('dunwoody') ? 'Dunwoody Market' : 
                        'Market Pickup',
            customer: {
              name: `${contact.firstName} ${contact.lastName}`,
              email: contact.email,
              phone: contact.phone
            },
            cart: cart.map(item => ({
              name: item.name,
              quantity: item.quantity,
              customizations: item.variantLabel ? [{ name: 'Variant', value: item.variantLabel }] : undefined
            }))
          });
          
          if (queueResult) {
            track('queue_joined', { orderId, marketId: fulfillment.pickup?.locationId });
            // Redirect to queue page - immediate feedback loop
            router.push(getQueueRedirectUrl(orderId));
            return;
          }
        } catch (queueError) {
          // Silent fail - don't block order success if queue fails
          console.error('Queue join failed:', queueError);
          track('queue_join_failed', { orderId, error: (queueError as Error).message });
        }
      }

      // Standard flow for non-pickup orders
      const amountCents = Math.round((serverTotal ?? totals.total) * 100);
      const params = new URLSearchParams({
        orderRef: orderId,
        paid: 'true',
        amount: String(amountCents),
      });

      if (result.orderAccessToken) {
        params.set('token', result.orderAccessToken);
      }

      router.push(`/order/success?${params.toString()}`);
    }, 2000);
  }, [orderId, router, totals.total, fulfillment, contact, cart, serverTotal]);
  
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-stone-50 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-700" />
                  Order Summary
                </h3>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 truncate">{item.name}</h4>
                        <p className="text-xs text-gray-500">Qty: {item.quantity} • {item.size}</p>
                        {item.isPreorder && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 mt-0.5">
                            ⏳ Preorder
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency((Number(item.price) || 0) * (Number(item.quantity) || 1))}
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

            {/* Preorder Notice */}
            {hasPreorderItems && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800">Preorder items in your cart</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      These items will be freshly prepared for your selected pickup date. 
                      You&apos;ll receive a text when your order is ready to collect.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Fulfillment Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                {fulfillment.type === 'pickup' ? (
                  <Clock className="w-4 h-4 text-emerald-700" />
                ) : (
                  <MapPin className="w-4 h-4 text-emerald-700" />
                )}
                {fulfillment.type === 'pickup' ? 'Pickup' : 'Delivery'} Details
              </h4>
              <div className="text-sm text-gray-600 space-y-1">
                {fulfillment.type === 'delivery' && fulfillment.delivery && (
                  <>
                    <p>{fulfillment.delivery.address.street}</p>
                    <p>{fulfillment.delivery.address.city}, {fulfillment.delivery.address.state} {fulfillment.delivery.address.zip}</p>
                    <p className="text-emerald-600">Window: {fulfillment.delivery.window}</p>
                    {fulfillment.delivery.deliveryMessage && (
                      <p className="text-emerald-600">{fulfillment.delivery.deliveryMessage}</p>
                    )}
                  </>
                )}
                {fulfillment.type === 'pickup' && fulfillment.pickup && (
                  <>
                    {pickupLocation && (
                      <>
                        <p className="font-medium text-gray-900">{pickupLocation.name}</p>
                        <p>{pickupLocation.address}</p>
                        <p>{pickupLocation.hours}</p>
                      </>
                    )}
                    {fulfillment.pickup.date && (
                      <p className="text-emerald-700">
                        Pickup date: {fulfillment.pickup.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                    )}
                  </>
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
                <p>{contact.firstName} {contact.lastName}</p>
                <p>{contact.email}</p>
                {contact.phone && <p>{contact.phone}</p>}
              </div>
            </div>
            
            {!fulfillmentReadiness.valid && !orderError && (
              <motion.div
                className="rounded-xl p-4 border bg-amber-50 border-amber-200"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start gap-3">
                  <Store className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-amber-800">Complete fulfillment details</h4>
                    <p className="text-sm mt-1 text-amber-700">{fulfillmentReadiness.error}</p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        onClick={onBack}
                        variant="outline"
                        size="sm"
                        className="border-amber-300 text-amber-700 hover:bg-amber-100"
                      >
                        Edit details
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {!validationResult.valid && !orderError && (
              <motion.div
                className={`rounded-xl p-4 border ${validationResult.code?.includes('PREORDER') ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start gap-3">
                  {validationResult.code?.includes('PREORDER') ? (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Store className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h4 className={`font-medium ${validationResult.code?.includes('PREORDER') ? 'text-red-800' : 'text-amber-800'}`}>
                      {validationResult.code?.includes('PREORDER') 
                        ? 'Cannot Proceed with Order' 
                        : 'Market Pickup Required'}
                    </h4>
                    <p className={`text-sm mt-1 ${validationResult.code?.includes('PREORDER') ? 'text-red-700' : 'text-amber-700'}`}>
                      {validationResult.error}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        onClick={onBack}
                        variant="outline"
                        size="sm"
                        className={validationResult.code?.includes('PREORDER') 
                          ? 'border-red-300 text-red-700 hover:bg-red-100'
                          : 'border-amber-300 text-amber-700 hover:bg-amber-100'}
                      >
                        {validationResult.code?.includes('PREORDER')
                          ? 'Edit Cart'
                          : 'Change to Market Pickup'}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

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
              disabled={isCreatingOrder || !canProceedToPayment}
              className="w-full h-14 text-lg font-semibold bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(serverTotal ?? totals.total)}</p>
              </div>
            </div>

            {/* Square Payment Form */}
            <SquarePaymentForm
              amountCents={Math.round((serverTotal ?? totals.total) * 100)}
              orderId={orderId}
              squareOrderId={squareOrderId || undefined}
              orderAccessToken={orderAccessToken || undefined}
              customer={{
                email: contact.email,
                name: `${contact.firstName} ${contact.lastName}`,
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
