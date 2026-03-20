'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Package, Mail, Phone, MapPin, Clock, CreditCard, ArrowRight, Sparkles, Heart, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

const MAX_ORDER_FETCH_ATTEMPTS = 12;
const PENDING_ORDER_STATUSES = new Set(['DRAFT', 'PENDING', 'pending', 'payment_processing', 'processing']);

function getRetryDelayMs(attempt) {
  const baseDelay = 1200;
  const exponent = Math.min(attempt, 6);
  return Math.min(Math.round(baseDelay * (1.5 ** exponent)), 10000);
}

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const orderRef = searchParams.get('orderRef') || searchParams.get('orderId'); // Support both for backward compatibility
  const orderAccessToken = searchParams.get('token');
  const isPaidFromUrl = searchParams.get('paid') === 'true';
  const amountFromUrl = searchParams.get('amount') ? parseInt(searchParams.get('amount'), 10) : null;
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pollAttempts, setPollAttempts] = useState(0);

  useEffect(() => {
    if (orderRef) {
      fetchOrderDetails();
    } else {
      setError('No order reference provided');
      setLoading(false);
    }
  }, [orderRef, orderAccessToken]);

  const fetchOrderDetails = async (attempt = 0) => {
    try {
      const requestParams = new URLSearchParams({ orderRef });
      if (orderAccessToken) {
        requestParams.set('token', orderAccessToken);
      }

      // Use stateless orderRef endpoint (no cookies required)
      const response = await fetch(`/api/orders/by-ref?${requestParams.toString()}`, {
        credentials: 'omit' // Explicitly no cookies
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Order access token is missing, invalid, or expired');
        }

        if (response.status === 404 && attempt < MAX_ORDER_FETCH_ATTEMPTS - 1) {
          const nextAttempt = attempt + 1;
          setPollAttempts(nextAttempt);
          setTimeout(() => fetchOrderDetails(nextAttempt), getRetryDelayMs(nextAttempt));
          return;
        }

        throw new Error(`HTTP ${response.status}: Order not found`);
      }
      
      const data = await response.json();
      
      // Poll for status transitions while Square settlement/webhooks finalize.
      if (PENDING_ORDER_STATUSES.has(data.status) && attempt < MAX_ORDER_FETCH_ATTEMPTS - 1) {
        const nextAttempt = attempt + 1;
        setPollAttempts(nextAttempt);
        setOrder(data); // Show what we have so far
        setTimeout(() => fetchOrderDetails(nextAttempt), getRetryDelayMs(nextAttempt));
        return;
      }
      
      setOrder(data);
      setError(null);
      setLoading(false);
      
    } catch (err) {
      console.error('Order fetch error:', err);
      
      // Retry transient failures with backoff to avoid false negatives during delayed settlement.
      if (attempt < MAX_ORDER_FETCH_ATTEMPTS - 1) {
        const nextAttempt = attempt + 1;
        setPollAttempts(nextAttempt);
        setTimeout(() => fetchOrderDetails(nextAttempt), getRetryDelayMs(nextAttempt));
        return;
      }
      
      setError(err.message || 'Failed to fetch order details');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">
            {pollAttempts > 0 ? 'Finalizing your order...' : 'Loading your order details...'}
          </p>
          {pollAttempts > 0 && (
            <p className="text-sm text-gray-500">
              Processing payment confirmation ({pollAttempts}/{MAX_ORDER_FETCH_ATTEMPTS})
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error || !order) {
    if (isPaidFromUrl) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-12">
          <div className="container max-w-4xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Received! ✓</h1>
              <p className="text-gray-600">
                Your payment{amountFromUrl ? ` of $${(amountFromUrl / 100).toFixed(2)}` : ''} was confirmed.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Your order details are being finalized. You&apos;ll receive a confirmation email shortly.
              </p>
            </div>
            <Card className="max-w-md mx-auto">
              <CardContent className="p-8 text-center space-y-4">
                {orderRef && (
                  <p className="text-xs text-gray-400 font-mono">
                    Ref: {orderRef}
                  </p>
                )}
                <Button
                  onClick={() => {
                    setLoading(true);
                    setError(null);
                    setPollAttempts(0);
                    fetchOrderDetails(0);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  🔄 Check Order Status
                </Button>
                <Link href="/catalog">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                    Continue Shopping
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-2">{error}</p>
            {orderRef && (
              <p className="text-xs text-gray-400 mb-6 font-mono">
                Ref: {orderRef}
              </p>
            )}
            <div className="space-y-3">
              <Button 
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  setPollAttempts(0);
                  fetchOrderDetails(0);
                }}
                variant="outline"
                className="w-full"
              >
                🔄 Retry
              </Button>
              <Link href="/catalog">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatPrice = (price) => `$${parseFloat(price || 0).toFixed(2)}`;
  
  // Use URL amount as fallback when order pricing isn't loaded yet
  const displayTotal = order?.pricing?.total || (amountFromUrl ? amountFromUrl / 100 : 0);
  const displaySubtotal = order?.pricing?.subtotal || displayTotal;
  const orderTiming = order?.orderTiming || order?.fulfillment?.timing;
  const requestedPreOrderDate = orderTiming?.requestedDate;
  const scheduledFulfillmentAt = order?.fulfillment?.scheduledFulfillmentAt || order?.fulfillment?.pickupDate;
  const isPreOrder = orderTiming?.mode === 'scheduled';

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-12">
      <div className="container max-w-4xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4 animate-bounce">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Order Confirmed! 🎉</h1>
          <p className="text-xl text-gray-600">Thank you for your order, {order.customer?.name}!</p>
        </div>

        {/* Order Details Card */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl mb-2">Order #{order.orderNumber}</CardTitle>
                <p className="text-emerald-100 text-sm">
                  {new Date(order.createdAt).toLocaleString('en-US', {
                    dateStyle: 'long',
                    timeStyle: 'short'
                  })}
                </p>
              </div>
              <Badge className="bg-white/20 text-white border-white/40">
                {order.status?.toUpperCase() || 'PENDING'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Payment Information */}
            {(isPaidFromUrl || order.paymentStatus === 'COMPLETED' || order.payment?.status === 'completed' || order.status === 'paid') && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg border-2 border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-900">Payment Confirmed</span>
                </div>
                <div className="space-y-2 text-sm">
                  {order.payment?.cardBrand && order.payment?.cardLast4 && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-green-600" />
                      <span className="text-green-800">{order.payment.cardBrand} ending in {order.payment.cardLast4}</span>
                    </div>
                  )}
                  {order.payment?.receiptNumber && (
                    <div className="flex items-center gap-2">
                      <span className="text-green-700">Receipt #: <code className="font-mono">{order.payment.receiptNumber}</code></span>
                    </div>
                  )}
                  {order.squarePaymentId && (
                    <div className="flex items-center gap-2">
                      <span className="text-green-700 text-xs">Payment ID: <code className="font-mono">{order.squarePaymentId}</code></span>
                    </div>
                  )}
                  {order.payment?.receiptUrl && (
                    <div className="mt-2">
                      <a 
                        href={order.payment.receiptUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-700 font-medium underline flex items-center gap-1"
                      >
                        View Square Receipt
                        <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Square Order ID */}
            {order.squareOrderId && (
              <div className="mb-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-900">Square Order ID</span>
                </div>
                <code className="text-sm text-emerald-700 font-mono">
                  {order.squareOrderId}
                </code>
              </div>
            )}

            {/* Items Ordered */}
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Items Ordered
              </h3>
              <div className="space-y-3">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                    </div>
                    <p className="font-semibold text-emerald-600">
                      {formatPrice(item.subtotal || item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Pricing Summary */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">{formatPrice(displaySubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fulfillment Timing</span>
                <span className="font-semibold">
                  {isPreOrder ? 'Pre-order request' : 'ASAP'}
                </span>
              </div>
              {order.pricing?.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="font-semibold">{formatPrice(order.pricing.deliveryFee)}</span>
                </div>
              )}
              {order.pricing?.tip > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tip</span>
                  <span className="font-semibold">{formatPrice(order.pricing.tip)}</span>
                </div>
              )}
              {order.pricing?.couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span className="font-semibold">-{formatPrice(order.pricing.couponDiscount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-bold">Total</span>
                <span className="font-bold text-emerald-600">
                  {formatPrice(displayTotal)}
                </span>
              </div>
            </div>

            {/* Customer & Fulfillment Info */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Contact Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{order.customer?.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{order.customer?.phone}</span>
                  </div>
                </div>
              </div>

              {/* Fulfillment Details */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  {order.fulfillmentType === 'delivery' ? <MapPin className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                  {order.fulfillmentType === 'delivery' ? 'Delivery Address' : 'Pickup Details'}
                </h4>
                {order.fulfillmentType === 'delivery' ? (
                  <div className="text-sm space-y-1">
                    <p>{order.deliveryAddress?.street}</p>
                    <p>
                      {order.deliveryAddress?.city}, {order.deliveryAddress?.state} {order.deliveryAddress?.zip}
                    </p>
                    {isPreOrder && (
                      <p className="text-amber-700 font-medium mt-2">
                        Timeline confirmation pending. We will contact you with final delivery timing.
                        {requestedPreOrderDate ? ` Requested date: ${new Date(`${requestedPreOrderDate}T00:00:00`).toLocaleDateString('en-US', { dateStyle: 'medium' })}.` : ''}
                      </p>
                    )}
                    {!isPreOrder && scheduledFulfillmentAt && (
                      <p className="text-emerald-700 font-medium mt-2">
                        Expected by: {new Date(scheduledFulfillmentAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-sm">
                    <p className="mb-2">Pickup at location</p>
                    <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                      Pickup Order
                    </Badge>
                    {isPreOrder && (
                      <p className="mt-2 text-amber-700 font-medium">
                        Timeline confirmation pending. We will contact you with your final pickup window.
                        {requestedPreOrderDate ? ` Requested date: ${new Date(`${requestedPreOrderDate}T00:00:00`).toLocaleDateString('en-US', { dateStyle: 'medium' })}.` : ''}
                      </p>
                    )}
                    {!isPreOrder && scheduledFulfillmentAt && (
                      <p className="mt-2 text-emerald-700 font-medium">
                        Pickup time: {new Date(scheduledFulfillmentAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Checkout URL if available */}
            {order.checkoutUrl && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-yellow-900 mb-2">Complete Your Payment</p>
                    <p className="text-sm text-yellow-700 mb-3">
                      Click the button below to complete your payment securely through Square.
                    </p>
                    <Button 
                      onClick={() => window.location.href = order.checkoutUrl}
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      Complete Payment
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Confirmation Message */}
        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="p-6 text-center">
            <Mail className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h3 className="font-semibold text-lg text-emerald-900 mb-2">
              Confirmation Email Sent!
            </h3>
            <p className="text-emerald-700 mb-4">
              We've sent a confirmation email to <strong>{order.customer?.email}</strong>
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/reviews">
                <Button variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-50">
                  Share A Review
                </Button>
              </Link>
              <Link href="/catalog">
                <Button variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50">
                  Continue Shopping
                </Button>
              </Link>
              <Link href="/">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Post-Purchase Reinforcement */}
        <Card className="mt-6 border-emerald-200">
          <CardContent className="p-6">
            <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              What's Next?
            </h3>
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* Step 1: Fulfillment */}
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  {order.fulfillmentType === 'delivery' ? (
                    <MapPin className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <Package className="w-6 h-6 text-emerald-600" />
                  )}
                </div>
                <h4 className="font-semibold text-emerald-900 mb-2">
                  {order.fulfillmentType === 'delivery' ? (isPreOrder ? 'Pre-Order Request Received' : 'Delivery Coming') : (isPreOrder ? 'Pre-Order Request Received' : 'Ready for Pickup')}
                </h4>
                <p className="text-sm text-emerald-700">
                  {isPreOrder
                    ? 'This is a pre-order request. We will confirm the exact timeline by phone or email.'
                    : order.fulfillmentType === 'delivery'
                      ? 'Your order will arrive within 2-3 business days'
                      : 'Bring your order confirmation email or ID'}
                </p>
              </div>

              {/* Step 2: Usage Tips */}
              <div className="text-center p-4 bg-teal-50 rounded-lg">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Heart className="w-6 h-6 text-teal-600" />
                </div>
                <h4 className="font-semibold text-teal-900 mb-2">How to Use</h4>
                <p className="text-sm text-teal-700">
                  Take 1-2 tablespoons daily, preferably in the morning. Refrigerate after opening & shake before use.
                </p>
              </div>

              {/* Step 3: Community */}
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 text-amber-600" />
                </div>
                <h4 className="font-semibold text-amber-900 mb-2">Join the Challenge</h4>
                <p className="text-sm text-amber-700 mb-3">
                  Track your wellness journey with our 14-Day Sea Moss Challenge
                </p>
                <Link href="/challenge">
                  <Button size="sm" variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-100">
                    Start Challenge
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
