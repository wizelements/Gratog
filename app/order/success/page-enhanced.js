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
  const orderRef = searchParams.get('orderRef') || searchParams.get('orderId');
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

      const response = await fetch(`/api/orders/by-ref?${requestParams.toString()}`, {
        credentials: 'omit'
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('LINK_EXPIRED');
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
      
      if (PENDING_ORDER_STATUSES.has(data.status) && attempt < MAX_ORDER_FETCH_ATTEMPTS - 1) {
        const nextAttempt = attempt + 1;
        setPollAttempts(nextAttempt);
        setOrder(data);
        setTimeout(() => fetchOrderDetails(nextAttempt), getRetryDelayMs(nextAttempt));
        return;
      }
      
      setOrder(data);
      setError(null);
      setLoading(false);
      
    } catch (err) {
      console.error('Order fetch error:', err);
      
      if (attempt < MAX_ORDER_FETCH_ATTEMPTS - 1 && err.message !== 'LINK_EXPIRED') {
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

  // 🎯 CONVERSION PSYCHOLOGY: Replace technical error with human-friendly recovery
  if (error === 'LINK_EXPIRED' || error?.includes?.('LINK_EXPIRED')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white p-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center space-y-6">
            {/* Security icon - reframes as protection, not failure */}
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Link Expired for Security</h2>
              <p className="text-gray-600">
                Your order was placed successfully! For your protection, order links expire after 7 days.
              </p>
            </div>
            
            {orderRef && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Order Reference</p>
                <p className="text-lg font-mono font-semibold text-emerald-700">{orderRef.slice(-6).toUpperCase()}</p>
                <p className="text-xs text-gray-400 mt-2">Show this at pickup or mention it when calling</p>
              </div>
            )}
            
            <div className="space-y-3">
              <a href="mailto:hello@tasteofgratitude.com" className="block">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Mail className="w-4 h-4 mr-2" />
                  Email for Fresh Link
                </Button>
              </a>
              
              <a href="tel:+14047899960">
                <Button variant="outline" className="w-full">
                  <Phone className="w-4 h-4 mr-2" />
                  Call/Text (404) 789-9960
                </Button>
              </a>
            </div>
            
            <div className="text-sm text-gray-500 pt-4 border-t">
              <p>Your confirmation email has your full order details.</p>
              <p className="mt-1">Check your inbox (and spam folder).</p>
            </div>
            
            <Link href="/catalog">
              <Button variant="ghost" className="w-full text-emerald-600">
                Continue Shopping
              </Button>
            </Link>
          </CardContent>
        </Card>
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
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full mb-4 animate-bounce">
            <CheckCircle className="w-12 h-12 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isPreOrder ? 'Pre-Order Confirmed!' : 'Order Confirmed!'}
          </h1>
          <p className="text-gray-600">
            Thank you{order?.customer?.firstName ? `, ${order.customer.firstName}` : ''}! 
            {isPreOrder 
              ? " We've received your pre-order and will prepare it for your selected date."
              : " We've received your order and are preparing it with gratitude."}
          </p>
          
          {/* 🎯 CONVERSION PSYCHOLOGY: Clear next steps */}
          {order?.fulfillment?.type?.includes('pickup') && (
            <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-800">
                <Link href={`/order/${order.id}/queue`} className="font-semibold underline">
                  View live queue position
                </Link>
              </span>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Order Details */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b">
                  <div>
                    <p className="text-sm text-gray-500">Order Reference</p>
                    <p className="text-lg font-mono font-semibold">{order.id?.slice(-6).toUpperCase()}</p>
                  </div>
                  <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                    {order.status}
                  </Badge>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  {(order.cart || order.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Pricing */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatPrice(displaySubtotal)}</span>
                  </div>
                  {order?.pricing?.deliveryFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery Fee</span>
                      <span>{formatPrice(order.pricing.deliveryFee)}</span>
                    </div>
                  )}
                  {order?.pricing?.tip > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tip</span>
                      <span>{formatPrice(order.pricing.tip)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span>{formatPrice(order?.pricing?.tax)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-emerald-600">{formatPrice(displayTotal)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fulfillment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {order?.fulfillment?.type?.includes('pickup') ? (
                    <Clock className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <MapPin className="w-5 h-5 text-emerald-600" />
                  )}
                  {order?.fulfillment?.type?.includes('pickup') ? 'Pickup Details' : 
                   order?.fulfillment?.type === 'delivery' ? 'Delivery Details' : 'Shipping Details'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order?.fulfillment?.type?.includes('pickup') && (
                  <div className="space-y-2">
                    <p className="font-medium">
                      {order.fulfillment.pickup?.locationId?.includes('serenbe') ? 'Serenbe Farmers Market' : 
                       order.fulfillment.pickup?.locationId?.includes('dunwoody') ? 'Dunwoody Market' : 
                       'Market Pickup'}
                    </p>
                    {scheduledFulfillmentAt && (
                      <p className="text-gray-600">
                        {new Date(scheduledFulfillmentAt).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                    
                    {/* 🎯 CONVERSION PSYCHOLOGY: Queue CTA for pickup orders */}
                    <Link href={`/order/${order.id}/queue`}>
                      <Button className="mt-4 w-full bg-amber-500 hover:bg-amber-600 text-white">
                        <Clock className="w-4 h-4 mr-2" />
                        Check Live Queue Position
                      </Button>
                    </Link>
                  </div>
                )}

                {order?.fulfillment?.type === 'delivery' && order.fulfillment.delivery && (
                  <div className="space-y-1">
                    <p className="font-medium">Delivery Address</p>
                    <p className="text-gray-600">{order.fulfillment.delivery.address?.street}</p>
                    <p className="text-gray-600">
                      {order.fulfillment.delivery.address?.city}, {order.fulfillment.delivery.address?.state} {order.fulfillment.delivery.address?.zip}
                    </p>
                    {order.fulfillment.delivery.window && (
                      <p className="text-emerald-600 mt-2">Window: {order.fulfillment.delivery.window}</p>
                    )}
                  </div>
                )}

                {order?.fulfillment?.type === 'shipping' && order.fulfillment.shipping && (
                  <div className="space-y-1">
                    <p className="font-medium">Shipping Address</p>
                    <p className="text-gray-600">{order.fulfillment.shipping.address?.street}</p>
                    <p className="text-gray-600">
                      {order.fulfillment.shipping.address?.city}, {order.fulfillment.shipping.address?.state} {order.fulfillment.shipping.address?.zip}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="font-medium">{order?.customer?.firstName} {order?.customer?.lastName}</p>
                <p className="text-gray-600">{order?.customer?.email}</p>
                {order?.customer?.phone && <p className="text-gray-600">{order.customer.phone}</p>}
              </CardContent>
            </Card>

            {/* Support Card */}
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-4">
                <h4 className="font-semibold text-emerald-800 mb-2">Need Help?</h4>
                <p className="text-sm text-emerald-700 mb-3">
                  Questions about your order? We&apos;re here to help!
                </p>
                <div className="space-y-2">
                  <a href="mailto:hello@tasteofgratitude.com">
                    <Button variant="outline" size="sm" className="w-full">
                      <Mail className="w-4 h-4 mr-2" />
                      Email Support
                    </Button>
                  </a>
                  <a href="tel:+14047899960">
                    <Button variant="outline" size="sm" className="w-full">
                      <Phone className="w-4 h-4 mr-2" />
                      (404) 789-9960
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* 🎯 CONVERSION PSYCHOLOGY: Spin Wheel - OPT-IN version */}
            {order?.pricing?.total >= 15 && (
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                <CardContent className="p-4 text-center">
                  <Sparkles className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <h4 className="font-semibold text-purple-800">Bonus Spins Earned!</h4>
                  <p className="text-sm text-purple-700 mb-3">
                    You earned {order?.pricing?.total >= 20 ? Math.floor(order.pricing.total / 20) : 1} spin{order?.pricing?.total >= 40 ? 's' : ''} for this order.
                  </p>
                  <Link href={`/profile/rewards?highlight=spin`}>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700">
                      <Star className="w-4 h-4 mr-2" />
                      Spin for Rewards
                    </Button>
                  </Link>
                  <p className="text-xs text-purple-600 mt-2">
                    Or skip and{' '}
                    <Link href="/catalog" className="underline">
                      continue shopping
                    </Link>
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <Link href="/catalog">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                  Continue Shopping
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href={order?.id ? `/order/${order.id}` : '/profile/orders'}>
                <Button variant="outline" className="w-full">
                  View Full Order Details
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
