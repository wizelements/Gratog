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
import { ArrowRight, ShoppingBag, Trash2, Plus, Minus, MapPin, Home, Package, CreditCard, AlertCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { loadCart, updateQuantity, removeFromCart, clearCart, getCartTotal, formatPrice } from '@/lib/cart-engine';
import SquarePaymentForm from '@/components/checkout/SquarePaymentForm';
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
  
  const [fulfillmentType, setFulfillmentType] = useState('pickup_market');
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    city: '',
    state: 'GA',
    zip: '',
  });
  const [deliveryValidation, setDeliveryValidation] = useState(null);
  const [validatingAddress, setValidatingAddress] = useState(false);
  const [meetUpDetails, setMeetUpDetails] = useState({
    location: '',
    phone: '',
    notes: ''
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
  
  // Calculate delivery fee with dynamic pricing
  const getDeliveryFee = () => {
    if (fulfillmentType !== 'delivery') return 0;
    
    // Default pricing (will be calculated based on distance when address is entered)
    // For display purposes, show base pricing structure
    if (subtotal >= 100) return 0; // FREE over $100
    if (subtotal >= 85) return 3.99 * 0.9; // 10% off
    if (subtotal >= 65) return 3.99 * 0.95; // 5% off
    return 3.99; // Base fee for 5-10 miles (example)
  };
  
  const deliveryFee = getDeliveryFee();
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
    // Validate minimum order amount - only for delivery, NOT pickup
    if (fulfillmentType === 'delivery' && subtotal < 30) {
      toast.error('Minimum order amount for delivery is $30');
      return false;
    }
    
    // Helper to scroll to first error field
    const scrollToField = (fieldId) => {
      setTimeout(() => {
        const field = document.getElementById(fieldId);
        if (field) {
          field.scrollIntoView({ behavior: 'smooth', block: 'center' });
          field.focus();
        }
      }, 100);
    };

    // Validate customer info
    if (!customer.name.trim()) {
      toast.error('Please enter your name');
      scrollToField('name');
      return false;
    }
    
    if (!customer.email.trim() || !customer.email.includes('@')) {
      toast.error('Please enter a valid email address');
      scrollToField('email');
      return false;
    }
    
    if (!customer.phone.trim()) {
      toast.error('Please enter your phone number');
      scrollToField('phone');
      return false;
    }

    // Validate delivery address if applicable
    if (fulfillmentType === 'delivery') {
      if (!deliveryAddress.street.trim()) {
        toast.error('Please enter your street address');
        scrollToField('street');
        return false;
      }
      if (!deliveryAddress.city.trim()) {
        toast.error('Please enter your city');
        scrollToField('city');
        return false;
      }
      if (!deliveryAddress.zip.trim() || deliveryAddress.zip.length < 5) {
        toast.error('Please enter a valid ZIP code');
        scrollToField('zip');
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
        ...(fulfillmentType === 'meetup_serenbe' && { 
          meetUpDetails: {
            location: 'Serenbe area',
            notes: meetUpDetails.notes
          }
        }),
      };

      logger.debug('Order data prepared', { orderData });

      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!response.ok) {
        // Extract detailed error message from API response
        const errorMessage = result.error || result.details || response.statusText || 'Failed to create order';
        logger.error('Order creation failed', { 
          status: response.status, 
          error: errorMessage 
        });
        throw new Error(errorMessage);
      }

      if (result.success) {
        logger.info('Order created successfully', { 
          orderId: result.order.id,
          squareOrderId: result.order.squareOrderId 
        });
        
        // Store order for in-app payment
        setOrderCreated(result.order);
        toast.success('Order created! Please complete payment.');
        logger.info('Order created, showing payment form', { orderId: result.order.id });
        
        // Scroll to top for payment form
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
    
    // Redirect to success page with orderRef (stateless pattern)
    const orderRef = orderCreated?.id; // Our orderId IS the orderRef
    toast.success('Payment successful! 🎉', { duration: 3000 });
    setTimeout(() => {
      router.push(`/order/success?orderRef=${orderRef}&paid=true`);
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
            amountCents={Math.round(total * 100)}
            squareOrderId={orderCreated.squareOrderId}
            customer={{
              email: customer.email,
              name: customer.name,
              phone: customer.phone
            }}
            onSuccess={handlePaymentSuccess}
            onError={(error) => {
              logger.error('Payment error', { error });
              toast.error(error || 'Payment failed. Please try again.');
            }}
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
                    {/* Serenbe Farmers Market Pickup */}
                    <div className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:border-emerald-600 transition-all hover:shadow-md">
                      <RadioGroupItem value="pickup_market" id="pickup_market" className="mt-1" />
                      <Label htmlFor="pickup_market" className="flex-1 cursor-pointer">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-emerald-50 rounded-lg">
                              <Package className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-lg">🏪 Serenbe Farmers Market</div>
                              <div className="text-sm text-emerald-600 font-medium">FREE Pickup • Most Popular</div>
                            </div>
                          </div>
                          
                          <div className="pl-14 space-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span>10950 Hutcheson Ferry Rd, Palmetto, GA 30268</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="font-medium text-gray-900">Saturdays: 9:00 AM - 1:00 PM</span>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 mt-2">
                              <div className="text-xs font-semibold text-emerald-800 mb-1">✨ What to Expect:</div>
                              <div className="text-xs text-emerald-700">Look for our <strong>gold "Taste of Gratitude" booth (#12)</strong>. Your order will be ready by <strong>9:30 AM Saturday</strong>. Just show your order number!</div>
                            </div>
                          </div>
                        </div>
                      </Label>
                    </div>
                    
                    {/* Browns Mill Community Pickup */}
                    <div className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:border-emerald-600 transition-all hover:shadow-md mt-3">
                      <RadioGroupItem value="pickup_browns_mill" id="pickup_browns_mill" className="mt-1" />
                      <Label htmlFor="pickup_browns_mill" className="flex-1 cursor-pointer">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                              <Package className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-lg">🏘️ Browns Mill Community</div>
                              <div className="text-sm text-blue-600 font-medium">FREE Pickup • Flexible Hours</div>
                            </div>
                          </div>
                          
                          <div className="pl-14 space-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span>Browns Mill Recreation Center, Atlanta, GA</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <div className="font-medium text-gray-900">
                                <div>Wed-Fri: Before 12pm or 12pm-6pm</div>
                                <div>Sun-Mon: After 10:30am</div>
                              </div>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-2">
                              <div className="text-xs font-semibold text-blue-800 mb-1">📞 Time Coordination:</div>
                              <div className="text-xs text-blue-700">We'll <strong>confirm your pickup time</strong> via Square dashboard and contact you to finalize the exact time within the available windows.</div>
                            </div>
                          </div>
                        </div>
                      </Label>
                    </div>
                    
                    {/* Meet Up After Market - Serenbe */}
                    <div className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:border-emerald-600 transition-all hover:shadow-md mt-3">
                      <RadioGroupItem value="meetup_serenbe" id="meetup_serenbe" className="mt-1" />
                      <Label htmlFor="meetup_serenbe" className="flex-1 cursor-pointer">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-50 rounded-lg">
                              <Package className="h-5 w-5 text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-lg">🤝 Meet Up After Market - Serenbe</div>
                              <div className="text-sm text-purple-600 font-medium">FREE • Flexible After-Hours</div>
                            </div>
                          </div>
                          
                          <div className="pl-14 space-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span>Custom location near Serenbe</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="font-medium text-gray-900">After 1:00 PM Saturdays (by arrangement)</span>
                            </div>
                            <div className="bg-purple-50 border border-purple-200 rounded-md p-3 mt-2">
                              <div className="text-xs font-semibold text-purple-800 mb-1">📞 Custom Coordination:</div>
                              <div className="text-xs text-purple-700">We'll coordinate a convenient meet-up location near Serenbe after market hours. You'll receive a call to arrange details.</div>
                            </div>
                          </div>
                        </div>
                      </Label>
                    </div>
                    
                    {/* Home Delivery */}
                    <div className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:border-emerald-600 transition-all hover:shadow-md mt-3">
                      <RadioGroupItem value="delivery" id="delivery" className="mt-1" />
                      <Label htmlFor="delivery" className="flex-1 cursor-pointer">
                        <div className="space-y-2">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-orange-50 rounded-lg">
                              <Home className="h-5 w-5 text-orange-600" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-lg">🚚 Home Delivery</div>
                              <div className="text-sm text-orange-600 font-medium">
                                {subtotal >= 100 ? '✨ FREE delivery (order over $100)' : 
                                 subtotal >= 85 ? '✨ 10% off delivery (order over $85)' :
                                 subtotal >= 65 ? '✨ 5% off delivery (order over $65)' :
                                 'Distance-based • FREE 0-5 miles'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="pl-14 text-sm text-gray-600">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span>2-3 business days</span>
                              </div>
                              <div className="text-xs text-gray-700 space-y-1 mt-2">
                                <div className="font-medium">Distance-based pricing:</div>
                                <div>• 0-5 miles: <span className="text-emerald-600 font-semibold">FREE</span></div>
                                <div>• 5-10 miles: $3.99 • 10-15 miles: $7.99</div>
                                <div>• 15-20 miles: $11.99 • 20-25 miles: $15.99</div>
                              </div>
                              <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2 mt-2">
                                💰 Order Discounts: $65+ (5% off) • $85+ (10% off) • $100+ (FREE delivery)
                              </div>
                            </div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>

                  {fulfillmentType === 'meetup_serenbe' && (
                    <div className="mt-6 p-4 bg-purple-50 rounded-lg space-y-4 animate-in slide-in-from-top duration-300">
                      <div className="flex items-center gap-2 text-purple-800 font-semibold mb-3">
                        <MapPin className="h-4 w-4" />
                        Meet-Up Coordination Details
                      </div>
                      <Alert className="bg-purple-100 border-purple-300">
                        <AlertCircle className="h-4 w-4 text-purple-600" />
                        <AlertDescription className="text-purple-800 text-sm">
                          We'll contact you at {customer.phone || 'your phone number'} to arrange the exact meet-up location and time.
                        </AlertDescription>
                      </Alert>
                      <div>
                        <Label htmlFor="meetup_notes">Preferred Time / Special Instructions (Optional)</Label>
                        <Input
                          id="meetup_notes"
                          value={meetUpDetails.notes}
                          onChange={(e) => setMeetUpDetails({ ...meetUpDetails, notes: e.target.value })}
                          placeholder="e.g., After 2 PM works best, near XYZ landmark"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  )}

                  {fulfillmentType === 'delivery' && (
                    <div className="mt-6 p-4 bg-emerald-50 rounded-lg space-y-4 animate-in slide-in-from-top duration-300">
                      <div className="flex items-center gap-2 text-emerald-800 font-semibold mb-3">
                        <MapPin className="h-4 w-4" />
                        Delivery Address (Within 5 miles)
                      </div>
                      <Alert className="bg-blue-50 border-blue-200">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800 text-sm">
                          Delivery available within 5 miles of Serenbe or Scotch Bonnet (Campbellton Rd area)
                        </AlertDescription>
                      </Alert>
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
                    {fulfillmentType === 'delivery' && subtotal < 30 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                        <div className="text-sm text-red-800 font-medium flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Delivery requires $30 minimum
                        </div>
                        <div className="text-xs text-red-700">
                          Add {formatPrice(30 - subtotal)} more to your cart to qualify for delivery.
                        </div>
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push('/catalog')}
                          className="w-full text-red-700 border-red-300 hover:bg-red-100"
                        >
                          <ShoppingBag className="w-3 h-3 mr-1" />
                          Continue Shopping
                        </Button>
                      </div>
                    )}
                    {fulfillmentType === 'delivery' && subtotal >= 25 && subtotal < 75 && (
                      <div className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded">
                        💡 Add {formatPrice(75 - subtotal)} more for FREE delivery!
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
                    disabled={isSubmitting || (fulfillmentType === 'delivery' && subtotal < 30)}
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
