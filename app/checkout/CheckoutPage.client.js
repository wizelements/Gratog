'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ShoppingCart, 
  AlertCircle, 
  CheckCircle2,
  ArrowRight,
  CreditCard,
  Package
} from 'lucide-react';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const paymentLinkUrl = searchParams.get('url');
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    // Check for payment link in URL params
    if (paymentLinkUrl) {
      // Redirect to Square payment link
      window.location.href = paymentLinkUrl;
      return;
    }

    // Load pending order from localStorage
    const pendingOrder = localStorage.getItem('pendingOrder');
    if (pendingOrder) {
      try {
        const order = JSON.parse(pendingOrder);
        setOrderData(order);
      } catch (e) {
        console.error('Failed to load order:', e);
      }
    }
    setLoading(false);
  }, [paymentLinkUrl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Active Checkout</h2>
            <p className="text-muted-foreground mb-4">
              You don't have an active checkout session. Please add items to your cart first.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => router.push('/catalog')} className="flex-1">
                Browse Products
              </Button>
              <Button onClick={() => router.push('/order')} variant="outline" className="flex-1">
                Start Order
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If we have order data, redirect to Square checkout
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-emerald-600" />
              Checkout Options
            </CardTitle>
            <CardDescription>
              Choose how you'd like to complete your order
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Square Online Checkout */}
            <Card className="border-2 border-emerald-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-100 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">Square Secure Checkout</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Complete your order securely using Square's payment system. Accept all major credit cards and digital wallets.
                    </p>
                    <Button 
                      onClick={() => router.push('/checkout/square')}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    >
                      Continue to Square Checkout
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Market Pickup */}
            {orderData?.fulfillmentType === 'pickup_market' && (
              <Alert className="bg-purple-50 border-purple-200">
                <Package className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-purple-800">
                  <strong>Pickup at Serenbe Farmers Market</strong>
                  <div className="mt-1 text-sm">
                    Your order will be ready for pickup at our market booth every Saturday from 9:00 AM - 1:00 PM.
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Order Summary */}
            <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Items:</span>
                    <span className="font-medium">{orderData?.cart?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-medium">${orderData?.subtotal?.toFixed(2) || '0.00'}</span>
                  </div>
                  {orderData?.deliveryFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Delivery Fee:</span>
                      <span className="font-medium">${orderData.deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  {orderData?.couponDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount:</span>
                      <span className="font-medium">-${orderData.couponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-emerald-600">${orderData?.total?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Back Button */}
            <Button
              onClick={() => router.push('/order')}
              variant="outline"
              className="w-full"
            >
              ← Back to Order
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
