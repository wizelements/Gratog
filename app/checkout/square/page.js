'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ExternalLink, 
  ShoppingCart, 
  AlertCircle, 
  CheckCircle2,
  Copy,
  ArrowRight,
  Package
} from 'lucide-react';
import { toast } from 'sonner';

function SquareCheckoutContent() {
  const router = useRouter();
  const [orderData, setOrderData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
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
  }, []);

  const copyOrderSummary = () => {
    if (!orderData) return;
    
    const summary = orderData.cart.map(item => 
      `${item.name} (${item.size}) x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');
    
    const fullSummary = `My Taste of Gratitude Order:\n\n${summary}\n\nSubtotal: $${orderData.subtotal.toFixed(2)}\nTotal: $${orderData.total.toFixed(2)}`;
    
    navigator.clipboard.writeText(fullSummary)
      .then(() => {
        setCopied(true);
        toast.success('Order summary copied to clipboard!');
        setTimeout(() => setCopied(false), 3000);
      })
      .catch((err) => {
        console.warn('Clipboard write failed:', err);
        toast.error('Unable to copy to clipboard. Please copy manually.');
      });
  };

  const openSquareStore = () => {
    window.open('https://tasteofgratitude.shop/s/order', '_blank');
  };

  const openProductOnSquare = (product) => {
    if (product.squareProductUrl) {
      window.open(product.squareProductUrl, '_blank');
    }
  };

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Order Found</h2>
            <p className="text-muted-foreground mb-4">
              Your order session may have expired
            </p>
            <Button onClick={() => router.push('/order')}>
              Start New Order
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        
        {/* Important Notice */}
        <Alert className="mb-6 border-blue-500 bg-blue-50">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Important:</strong> Due to Square Online limitations, you'll need to manually add items on the Square store. 
            We've made it easy - just click the buttons below for each product!
          </AlertDescription>
        </Alert>

        {/* Order Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-emerald-600" />
                Your Order Summary
              </span>
              <Button
                onClick={copyOrderSummary}
                variant="outline"
                size="sm"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy List
                  </>
                )}
              </Button>
            </CardTitle>
            <CardDescription>
              Review your items below, then add them to your Square cart
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Cart Items */}
            <div className="space-y-3">
              {orderData.cart.map((item, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-white rounded-lg border">
                  {item.image && (
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-20 h-20 rounded object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.size} × {item.quantity}
                    </div>
                    <div className="text-sm font-medium text-emerald-600">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                  <Button
                    onClick={() => openProductOnSquare(item)}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Add to Square
                  </Button>
                </div>
              ))}
            </div>
            
            {/* Order Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-semibold">${orderData.subtotal.toFixed(2)}</span>
              </div>
              {orderData.deliveryFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Delivery Fee:</span>
                  <span className="font-semibold">${orderData.deliveryFee.toFixed(2)}</span>
                </div>
              )}
              {orderData.couponDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Coupon Discount:</span>
                  <span className="font-semibold">-${orderData.couponDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="text-emerald-600">${orderData.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Customer Info */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2 text-sm">Customer Information</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>{orderData.customer.name}</div>
                <div>{orderData.customer.email}</div>
                <div>{orderData.customer.phone}</div>
              </div>
            </div>

            {/* Fulfillment Info */}
            {orderData.fulfillmentType && (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2 text-sm">Fulfillment</h4>
                <div className="text-sm text-muted-foreground">
                  {orderData.fulfillmentType === 'pickup_market' && (
                    <>
                      <div className="flex items-center gap-2 font-medium text-emerald-700">
                        <Package className="w-4 h-4" />
                        Pickup at Serenbe Farmers Market
                      </div>
                      <div className="mt-1">Saturdays 9:00 AM - 1:00 PM</div>
                      <div className="mt-2 text-xs bg-yellow-50 border border-yellow-200 rounded p-2">
                        📝 <strong>Note for pickup:</strong> When checking out on Square, 
                        select "Pickup" and we'll have your order ready at the market!
                      </div>
                    </>
                  )}
                  {orderData.fulfillmentType === 'delivery' && orderData.deliveryAddress && (
                    <>
                      <div className="font-medium">Delivery Address:</div>
                      <div>{orderData.deliveryAddress.street}</div>
                      <div>{orderData.deliveryAddress.city}, {orderData.deliveryAddress.state} {orderData.deliveryAddress.zip}</div>
                      <div className="mt-2 text-xs bg-yellow-50 border border-yellow-200 rounded p-2">
                        📝 <strong>Note:</strong> In the Square checkout "Special Instructions" field, 
                        please paste your address: {orderData.deliveryAddress.street}, {orderData.deliveryAddress.city}, {orderData.deliveryAddress.state} {orderData.deliveryAddress.zip}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Coupon Code Info */}
            {orderData.appliedCoupon && (
              <div className="border-t pt-4">
                <Alert className="bg-purple-50 border-purple-200">
                  <AlertDescription className="text-purple-800">
                    <strong>💰 You have a discount!</strong>
                    <div className="mt-2">
                      Coupon Code: <code className="bg-white px-2 py-1 rounded font-mono text-sm">{orderData.appliedCoupon.code}</code>
                    </div>
                    <div className="mt-1 text-sm">
                      Discount: ${orderData.appliedCoupon.discount} OFF
                    </div>
                    <div className="mt-2 text-xs">
                      ⚠️ Square doesn't automatically apply this discount. After completing your purchase, 
                      email us at <a href="mailto:hello@tasteofgratitude.shop" className="underline">hello@tasteofgratitude.shop</a> with 
                      your order # and coupon code for a refund!
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How to Complete Your Order */}
        <Card className="mb-6 border-2 border-emerald-500">
          <CardHeader className="bg-emerald-50">
            <CardTitle className="text-emerald-800">
              How to Complete Your Order (3 Easy Steps)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <div className="font-semibold mb-1">Click "Add to Square" for each product above</div>
                <div className="text-sm text-muted-foreground">
                  Each button opens the product page on our Square store. Add the item and quantity shown.
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <div className="font-semibold mb-1">Complete checkout on Square</div>
                <div className="text-sm text-muted-foreground">
                  Fill in your payment details and select {orderData.fulfillmentType === 'pickup_market' ? 'Pickup' : 'Delivery'}.
                  {orderData.deliveryAddress && ' Paste your delivery address in Special Instructions.'}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <div className="font-semibold mb-1">You're done!</div>
                <div className="text-sm text-muted-foreground">
                  You'll receive confirmation via email and earn {Math.floor(orderData.total / 20) || 1} spin{Math.floor(orderData.total / 20) > 1 ? 's' : ''} for rewards!
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Action: Open Square Store */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={openSquareStore}
            size="lg"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-lg py-6"
          >
            <ExternalLink className="mr-2 h-5 w-5" />
            Or Browse All Products on Square Store
          </Button>
          
          <div className="flex gap-3">
            <Button
              onClick={() => router.push('/order')}
              variant="outline"
              className="flex-1"
            >
              ← Back to Order
            </Button>
            
            <Button
              onClick={() => router.push('/catalog')}
              variant="outline"
              className="flex-1"
            >
              Browse More Products
            </Button>
          </div>
        </div>

        {/* Helper Notice */}
        <Card className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="p-6">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span className="text-2xl">💡</span>
              Why This Process?
            </h4>
            <p className="text-sm text-muted-foreground">
              Square Online doesn't support adding multiple items via links without API access. 
              We're working on getting full API access to streamline this! For now, 
              adding items individually ensures you get the same secure Square checkout experience.
            </p>
            <div className="mt-4 text-xs text-purple-700 bg-white/50 rounded p-3">
              <strong>Good news:</strong> Once we get Square API access, you'll be able to checkout 
              with your full cart in one click! We appreciate your patience. 🙏
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SquareCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    }>
      <SquareCheckoutContent />
    </Suspense>
  );
}
