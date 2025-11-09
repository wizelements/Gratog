'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, ShoppingBag, Trash2, Plus, Minus, MapPin, Home, Package, CreditCard, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { loadCart, updateQuantity, removeFromCart, clearCart, getCartTotal, formatPrice } from '@/lib/cartUtils';
import SquarePaymentForm from '@/components/SquarePaymentForm';
import { createLogger } from '@/lib/logger';

const logger = createLogger('OrderPage');

export default function OrderPage() {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('in-app'); // Always in-app (Payment Links removed)
  const [orderCreated, setOrderCreated] = useState(null); // Stores created order for payment
  
  // Form state
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    phone: '',
  });
  
  const [fulfillmentType, setFulfillmentType] = useState('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    city: '',
    state: 'GA',
    zip: '',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const loadedCart = loadCart();
        setCart(loadedCart);
        setIsHydrated(true);
        logger.info('Order page loaded', { cartItems: loadedCart.length });
      } catch (error) {
        logger.error('Failed to load cart', { error: error.message });
        toast.error('Failed to load cart. Please try again.');
      }
    }
  }, []);

  const { subtotal, totalItems } = getCartTotal();
  const deliveryFee = fulfillmentType === 'delivery' ? (subtotal >= 75 ? 0 : 6.99) : 0;
  const total = subtotal + deliveryFee;

  const handleQuantityChange = (productId, change) => {
    try {
      const item = cart.find(i => i.id === productId);
      if (!item) {
        logger.warn('Item not found in cart', { productId });
        return;
      }
      
      const newQuantity = item.quantity + change;
      if (newQuantity > 0) {
        const newCart = updateQuantity(productId, newQuantity);
        setCart(newCart);
        logger.info('Quantity updated', { productId, newQuantity });
      } else {
        handleRemoveItem(productId);
      }
    } catch (error) {
      logger.error('Failed to update quantity', { error: error.message, productId });
      toast.error('Failed to update quantity');
    }
  };

  const handleRemoveItem = (productId) => {
    try {
      const newCart = removeFromCart(productId);
      setCart(newCart);
      toast.success('Item removed from cart');
      logger.info('Item removed', { productId });
    } catch (error) {
      logger.error('Failed to remove item', { error: error.message, productId });
      toast.error('Failed to remove item');
    }
  };

  const validateForm = () => {
    // Validate customer info
    if (!customer.name.trim()) {
      toast.error('Please enter your name');
      return false;
    }
    
    if (!customer.email.trim() || !customer.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return false;
    }
    
    if (!customer.phone.trim()) {
      toast.error('Please enter your phone number');
      return false;
    }

    // Validate delivery address if applicable
    if (fulfillmentType === 'delivery') {
      if (!deliveryAddress.street.trim()) {
        toast.error('Please enter your street address');
        return false;
      }
      if (!deliveryAddress.city.trim()) {
        toast.error('Please enter your city');
        return false;
      }
      if (!deliveryAddress.zip.trim() || deliveryAddress.zip.length < 5) {
        toast.error('Please enter a valid ZIP code');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      logger.warn('Attempted checkout with empty cart');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    logger.info('Submitting order', { 
      fulfillmentType, 
      cartItems: cart.length, 
      total,
      paymentMethod
    });

    try {
      const orderData = {
        cart: cart.map(item => ({
          catalogObjectId: item.variationId || item.catalogObjectId || item.id,
          variationId: item.variationId || item.catalogObjectId || item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        customer: {
          name: customer.name.trim(),
          email: customer.email.trim(),
          phone: customer.phone.trim(),
        },
        fulfillmentType,
        ...(fulfillmentType === 'delivery' && { deliveryAddress }),
      };

      logger.debug('Order data prepared', { orderData });

      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        logger.info('Order created successfully', { 
          orderId: result.order.id,
          squareOrderId: result.order.squareOrderId 
        });
        
        // Store order for in-app payment
        setOrderCreated(result.order);
        toast.success('Order created! Please complete payment.');
        logger.info('Order created, showing payment form', { orderId: result.order.id });
        // The payment form will be shown via orderCreated state
      } else {
        throw new Error(result.error || 'Failed to create order');
      }
    } catch (error) {
      logger.error('Order submission error', { 
        error: error.message,
        stack: error.stack 
      });
      toast.error(error.message || 'Failed to create order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = (paymentData) => {
    logger.info('Payment successful', { 
      orderId: orderCreated?.id,
      paymentId: paymentData.payment?.id 
    });
    
    // Clear cart
    clearCart();
    setCart([]);
    
    // Redirect to success page
    toast.success('Payment successful! 🎉', { duration: 3000 });
    setTimeout(() => {
      router.push(`/order/success?orderId=${orderCreated.id}&squareOrderId=${orderCreated.squareOrderId}&paid=true`);
    }, 1500);
  };

  if (!isHydrated) {
    return (
      <div className="container py-20 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (cart.length === 0 && !orderCreated) {
    return (
      <div className="container py-20">
        <Card className="max-w-md mx-auto text-center p-12">
          <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Add some products to get started!</p>
          <Button onClick={() => router.push('/catalog')} className="bg-emerald-600 hover:bg-emerald-700">
            Browse Products
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Card>
      </div>
    );
  }

  // Show payment form if order created
  if (orderCreated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-12">
        <div className="container max-w-2xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Complete Payment</h1>
            <p className="text-gray-600">Order #{orderCreated.orderNumber} - Total: ${total.toFixed(2)}</p>
          </div>

          <SquarePaymentForm
            orderId={orderCreated.id}
            orderTotal={total}
            squareOrderId={orderCreated.squareOrderId}
            onPaymentSuccess={handlePaymentSuccess}
          />

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => setOrderCreated(null)}
              className="text-gray-600"
            >
              ← Back to Order Form
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-12">
      <div className="container max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-600">Complete your order in just a few steps</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge className="bg-emerald-600">1</Badge>
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      placeholder="John Doe"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={customer.email}
                        onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                        placeholder="john@example.com"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={customer.phone}
                        onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                        placeholder="(404) 555-1234"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fulfillment Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge className="bg-emerald-600">2</Badge>
                    Fulfillment Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={fulfillmentType} onValueChange={setFulfillmentType} disabled={isSubmitting}>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:border-emerald-600 transition-colors">
                      <RadioGroupItem value="pickup" id="pickup" />
                      <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-emerald-600" />
                          <div>
                            <div className="font-semibold">Pickup</div>
                            <div className="text-sm text-gray-600">Pick up at our location - Free</div>
                          </div>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:border-emerald-600 transition-colors">
                      <RadioGroupItem value="delivery" id="delivery" />
                      <Label htmlFor="delivery" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Home className="h-5 w-5 text-emerald-600" />
                          <div>
                            <div className="font-semibold">Delivery</div>
                            <div className="text-sm text-gray-600">
                              {subtotal >= 75 ? 'FREE delivery (over $75)' : '$6.99 delivery fee (under $75)'}
                            </div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>

                  {fulfillmentType === 'delivery' && (
                    <div className="mt-6 p-4 bg-emerald-50 rounded-lg space-y-4 animate-in slide-in-from-top duration-300">
                      <div className="flex items-center gap-2 text-emerald-800 font-semibold mb-3">
                        <MapPin className="h-4 w-4" />
                        Delivery Address
                      </div>
                      <div>
                        <Label htmlFor="street">Street Address *</Label>
                        <Input
                          id="street"
                          value={deliveryAddress.street}
                          onChange={(e) => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })}
                          placeholder="123 Main St"
                          required={fulfillmentType === 'delivery'}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            value={deliveryAddress.city}
                            onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                            placeholder="Atlanta"
                            required={fulfillmentType === 'delivery'}
                            disabled={isSubmitting}
                          />
                        </div>
                        <div>
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            value={deliveryAddress.state}
                            onChange={(e) => setDeliveryAddress({ ...deliveryAddress, state: e.target.value })}
                            placeholder="GA"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div>
                          <Label htmlFor="zip">ZIP Code *</Label>
                          <Input
                            id="zip"
                            value={deliveryAddress.zip}
                            onChange={(e) => setDeliveryAddress({ ...deliveryAddress, zip: e.target.value })}
                            placeholder="30303"
                            required={fulfillmentType === 'delivery'}
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge className="bg-emerald-600">3</Badge>
                    Payment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert className="bg-blue-50 border-blue-200">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      You'll complete payment securely on the next page using Square's encrypted checkout. Your card details are never stored.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Cart Items */}
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.id} className="flex gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex-1">
                          <div className="font-medium text-sm line-clamp-1">{item.name}</div>
                          <div className="text-emerald-600 font-bold">{formatPrice(item.price)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuantityChange(item.id, -1)}
                            className="h-7 w-7 p-0"
                            disabled={isSubmitting}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuantityChange(item.id, 1)}
                            className="h-7 w-7 p-0"
                            disabled={isSubmitting}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveItem(item.id)}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                            disabled={isSubmitting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal ({totalItems} items)</span>
                      <span className="font-semibold">{formatPrice(subtotal)}</span>
                    </div>
                    {deliveryFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Delivery Fee</span>
                        <span className="font-semibold">{formatPrice(deliveryFee)}</span>
                      </div>
                    )}
                    {fulfillmentType === 'delivery' && subtotal < 75 && (
                      <div className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded">
                        Add {formatPrice(75 - subtotal)} more for FREE delivery!
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-emerald-600">{formatPrice(total)}</span>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Processing...
                      </span>
                    ) : (
                      <>
                        {paymentMethod === 'in-app' ? (
                          <>
                            <CreditCard className="mr-2 h-5 w-5" />
                            Continue to Payment
                          </>
                        ) : (
                          <>
                            Place Order
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-gray-500">
                    🔒 Secure {paymentMethod === 'in-app' ? 'payment' : 'checkout'} powered by Square
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
