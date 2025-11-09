'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Package, Mail, Phone, MapPin, Clock, CreditCard, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const squareOrderId = searchParams.get('squareOrderId');
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    } else {
      setError('No order ID provided');
      setLoading(false);
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      const data = await response.json();
      
      if (data.success) {
        setOrder(data.order);
      } else {
        setError(data.error || 'Failed to load order');
      }
    } catch (err) {
      setError('Failed to fetch order details');
      console.error('Order fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link href="/catalog">
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                Continue Shopping
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatPrice = (price) => `$${parseFloat(price).toFixed(2)}`;

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
            {/* Square Order ID */}
            {(order.squareOrderId || squareOrderId) && (
              <div className="mb-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-900">Square Order ID</span>
                </div>
                <code className="text-sm text-emerald-700 font-mono">
                  {order.squareOrderId || squareOrderId}
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
                <span className="font-semibold">{formatPrice(order.pricing?.subtotal || 0)}</span>
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
                  {formatPrice(order.pricing?.total || 0)}
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
                  </div>
                ) : (
                  <div className="text-sm">
                    <p className="mb-2">Pickup at location</p>
                    <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                      Pickup Order
                    </Badge>
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
            <div className="flex gap-4 justify-center">
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
      </div>
    </div>
  );
}
