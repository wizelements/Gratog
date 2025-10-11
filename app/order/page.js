'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, Plus, Minus, Package, Truck, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PRODUCTS } from '@/lib/products';
import { getDeliveryZoneByZip, calculateDynamicDeliveryFee, getDeliveryTimeSlots, getFulfillmentOptions } from '@/lib/delivery-zones';
import SquarePaymentForm from '@/components/SquarePaymentForm';
import SpinWheel from '@/components/SpinWheel';
import CouponInput from '@/components/CouponInput';

export default function OrderPage() {
  const [step, setStep] = useState(1); // 1: Browse, 2: Info, 3: Fulfillment, 4: Review
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [fulfillmentType, setFulfillmentType] = useState('pickup_market');
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    city: 'Atlanta',
    state: 'GA',
    zip: ''
  });
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [deliveryZone, setDeliveryZone] = useState(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState([]);
  
  // Coupon state
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [hasWonPrize, setHasWonPrize] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (deliveryAddress.zip && deliveryAddress.zip.length === 5) {
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const deliveryResult = calculateDynamicDeliveryFee(
        deliveryAddress.zip, 
        subtotal, 
        deliveryAddress.city, 
        deliveryAddress.state
      );
      setDeliveryZone(deliveryResult.zone);
      setDeliveryFee(deliveryResult.fee);
    }
  }, [deliveryAddress.zip, deliveryAddress.city, deliveryAddress.state, cart]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/products');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts(PRODUCTS.map(p => ({ ...p, stock: 50 })));
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    toast.success(`Added ${product.name} to cart`);
  };

  const updateQuantity = (productId, change) => {
    setCart(cart.map(item => {
      if (item.id === productId) {
        const newQty = item.quantity + change;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  // Coupon handlers
  const handleSpinWin = (prize) => {
    setHasWonPrize(true);
    if (prize.couponCode) {
      setAppliedCoupon({
        code: prize.couponCode,
        discountAmount: prize.value,
        freeShipping: prize.freeShipping || false,
        description: prize.label
      });
      toast.success(`🎉 ${prize.label} applied to your order!`);
    }
    setShowSpinWheel(false);
  };

  const handleCouponApplied = (coupon) => {
    setAppliedCoupon(coupon);
  };

  const handleCouponRemoved = () => {
    setAppliedCoupon(null);
  };

  // Calculate totals with coupon
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const couponDiscount = appliedCoupon?.discountAmount || 0;
  const adjustedDeliveryFee = appliedCoupon?.freeShipping ? 0 : (fulfillmentType === 'delivery' ? deliveryFee : 0);
  const total = Math.max(0, subtotal - couponDiscount + adjustedDeliveryFee);

  const handlePaymentSuccess = (result) => {
    toast.success('Payment successful! Order confirmed.');
    // Redirect to order confirmation page
    setTimeout(() => {
      window.location.href = `/order/${result.orderId || result.paymentId}`;
    }, 2000);
  };

  const handlePaymentError = (error) => {
    toast.error(error.message || 'Payment failed. Please try again.');
    console.error('Payment error:', error);
  };

  // Step 1: Browse Products
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D4AF37]/5 to-background">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-40">
          <div className="container py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gradient-gold">Taste of Gratitude</h1>
                <p className="text-sm text-muted-foreground">Serenbe Farmers Market</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Spin Wheel Button */}
                <Button
                  onClick={() => setShowSpinWheel(true)}
                  variant="outline"
                  className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
                  disabled={!customer.email}
                >
                  🎡 Spin & Win!
                </Button>
                
                {/* Cart Button */}
                <Button
                  onClick={() => cart.length > 0 && setStep(2)}
                  className="bg-[#D4AF37] hover:bg-[#B8941F] relative"
                  disabled={cart.length === 0}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Cart ({cart.length})
                  {cart.length > 0 && (
                    <Badge className="ml-2 bg-white text-[#D4AF37]">
                      ${(subtotal / 100).toFixed(2)}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="container py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(product => (
              <Card key={product.id} className="overflow-hidden hover-lift">
                <div className="relative h-48 bg-muted">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                  {product.stock === 0 ? (
                    <Badge className="absolute top-3 right-3 bg-red-600">
                      Out of Stock
                    </Badge>
                  ) : product.stock <= product.lowStockThreshold ? (
                    <Badge className="absolute top-3 right-3 bg-yellow-600">
                      Only {product.stock} left!
                    </Badge>
                  ) : (
                    <Badge className="absolute top-3 right-3 bg-green-600">
                      In Stock
                    </Badge>
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{product.subtitle}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold text-[#D4AF37]">
                      ${(product.price / 100).toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground">{product.size}</span>
                  </div>
                  {product.stock === 0 ? (
                    <Button variant="outline" className="w-full" disabled>
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Out of Stock
                    </Button>
                  ) : (
                    <Button
                      onClick={() => addToCart(product)}
                      className="w-full bg-[#D4AF37] hover:bg-[#B8941F]"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add to Cart
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Customer Info
  if (step === 2) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto py-8">
          <Button variant="ghost" onClick={() => setStep(1)} className="mb-4">
            ← Back to Products
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
              <p className="text-sm text-muted-foreground">
                We'll use this to contact you about your order
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={customer.name}
                  onChange={(e) => setCustomer({...customer, name: e.target.value})}
                  placeholder="Jane Smith"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({...customer, email: e.target.value})}
                  placeholder="jane@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={customer.phone}
                  onChange={(e) => setCustomer({...customer, phone: e.target.value})}
                  placeholder="(404) 555-1234"
                  required
                />
              </div>

              <Button
                onClick={() => setStep(3)}
                className="w-full bg-[#D4AF37] hover:bg-[#B8941F]"
                disabled={!customer.name || !customer.email || !customer.phone}
              >
                Continue to Fulfillment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Step 3: Fulfillment
  if (step === 3) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto py-8">
          <Button variant="ghost" onClick={() => setStep(2)} className="mb-4">
            ← Back
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>How would you like to receive your order?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={fulfillmentType} onValueChange={setFulfillmentType}>
                {/* Pickup during market */}
                <div className="flex items-start space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted" onClick={() => setFulfillmentType('pickup_market')}>
                  <RadioGroupItem value="pickup_market" id="pickup_market" />
                  <Label htmlFor="pickup_market" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="h-5 w-5 text-[#D4AF37]" />
                      <span className="font-semibold">Pick up during market</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Serenbe Farmers Market - Saturdays 9:00 AM to 1:00 PM at Booth #12
                    </p>
                  </Label>
                </div>

                {/* Pickup after market at Browns Mill */}
                <div className="flex items-start space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted" onClick={() => setFulfillmentType('pickup_browns_mill')}>
                  <RadioGroupItem value="pickup_browns_mill" id="pickup_browns_mill" />
                  <Label htmlFor="pickup_browns_mill" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="h-5 w-5 text-[#D4AF37]" />
                      <span className="font-semibold">Pick up after market</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Browns Mill Community - Saturdays 3:00 PM to 6:00 PM
                    </p>
                  </Label>
                </div>

                {/* Pickup at next event */}
                <div className="flex items-start space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted opacity-60" onClick={() => setFulfillmentType('pickup_event')}>
                  <RadioGroupItem value="pickup_event" id="pickup_event" disabled />
                  <Label htmlFor="pickup_event" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <span className="font-semibold text-muted-foreground">Pick up at next event</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No upcoming events scheduled - check back soon!
                    </p>
                  </Label>
                </div>

                {/* Delivery */}
                <div className="flex items-start space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted" onClick={() => setFulfillmentType('delivery')}>
                  <RadioGroupItem value="delivery" id="delivery" />
                  <Label htmlFor="delivery" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="h-5 w-5 text-[#D4AF37]" />
                      <span className="font-semibold">Delivery</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Atlanta metro area - fee varies by location (sliding scale)
                    </p>
                  </Label>
                </div>
              </RadioGroup>

              {fulfillmentType === 'delivery' && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="street">Street Address *</Label>
                    <Input
                      id="street"
                      value={deliveryAddress.street}
                      onChange={(e) => setDeliveryAddress({...deliveryAddress, street: e.target.value})}
                      placeholder="123 Main St"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={deliveryAddress.city}
                          onChange={(e) => setDeliveryAddress({...deliveryAddress, city: e.target.value})}
                          placeholder="Atlanta"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State *</Label>
                        <Select 
                          value={deliveryAddress.state} 
                          onValueChange={(value) => setDeliveryAddress({...deliveryAddress, state: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="GA" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GA">Georgia</SelectItem>
                            <SelectItem value="AL">Alabama</SelectItem>
                            <SelectItem value="SC">South Carolina</SelectItem>
                            <SelectItem value="NC">North Carolina</SelectItem>
                            <SelectItem value="FL">Florida</SelectItem>
                            <SelectItem value="TN">Tennessee</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip">Zip Code *</Label>
                      <Input
                        id="zip"
                        value={deliveryAddress.zip}
                        onChange={(e) => setDeliveryAddress({...deliveryAddress, zip: e.target.value})}
                        placeholder="30344"
                        maxLength={5}
                        required
                      />
                    </div>
                  </div>

                  {deliveryZone && (
                    <div className="p-4 bg-[#D4AF37]/10 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">Delivery Zone: {deliveryZone.name}</p>
                        {deliveryZone.estimated && (
                          <Badge variant="outline" className="text-xs">Estimated</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">Distance: {deliveryZone.distance}</p>
                      <p className="text-sm text-muted-foreground">Est. Time: {deliveryZone.estimatedTime}</p>
                      
                      <div className="pt-2 border-t border-[#D4AF37]/20">
                        <p className="text-lg font-bold text-[#D4AF37]">
                          Delivery Fee: ${(deliveryFee / 100).toFixed(2)}
                          {deliveryFee === 0 ? (
                            <Badge className="ml-2 bg-green-600">FREE DELIVERY!</Badge>
                          ) : deliveryZone.fee && deliveryFee < deliveryZone.fee ? (
                            <Badge className="ml-2 bg-blue-600">DISCOUNTED!</Badge>
                          ) : null}
                        </p>
                        
                        {deliveryZone.freeThreshold && subtotal < deliveryZone.freeThreshold && (
                          <p className="text-xs text-muted-foreground mt-1">
                            💡 Free delivery on orders ${(deliveryZone.freeThreshold / 100).toFixed(0)}+
                            {deliveryZone.fee && deliveryFee < deliveryZone.fee && (
                              <span> • Sliding scale discount applied!</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="timeSlot">Delivery Time</Label>
                    <Select value={deliveryTimeSlot} onValueChange={setDeliveryTimeSlot}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time slot" />
                      </SelectTrigger>
                      <SelectContent>
                        {getDeliveryTimeSlots().map(slot => (
                          <SelectItem key={slot.value} value={slot.value}>
                            {slot.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instructions">Delivery Instructions (optional)</Label>
                    <Textarea
                      id="instructions"
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                      placeholder="e.g., Leave at front door, ring bell"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={() => setStep(4)}
                className="w-full bg-[#D4AF37] hover:bg-[#B8941F]"
                disabled={fulfillmentType === 'delivery' && (!deliveryAddress.street || !deliveryAddress.zip || !deliveryAddress.city || !deliveryTimeSlot)}
              >
                Review Order
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Step 4: Review & Submit
  if (step === 4) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto py-8">
          <Button variant="ghost" onClick={() => setStep(3)} className="mb-4">
            ← Back
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Review Your Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Customer */}
              <div>
                <h3 className="font-semibold mb-2">Customer</h3>
                <p className="text-sm text-muted-foreground">{customer.name}</p>
                <p className="text-sm text-muted-foreground">{customer.email}</p>
                <p className="text-sm text-muted-foreground">{customer.phone}</p>
              </div>

              {/* Fulfillment */}
              <div>
                <h3 className="font-semibold mb-2">Fulfillment</h3>
                {fulfillmentType === 'pickup_market' ? (
                  <div className="flex items-start gap-2">
                    <Package className="h-5 w-5 text-[#D4AF37] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Pickup at Market</p>
                      <p className="text-sm text-muted-foreground">Serenbe Farmers Market - Booth #12</p>
                      <p className="text-sm text-muted-foreground">Saturdays 9:00 AM - 1:00 PM</p>
                    </div>
                  </div>
                ) : fulfillmentType === 'pickup_browns_mill' ? (
                  <div className="flex items-start gap-2">
                    <Package className="h-5 w-5 text-[#D4AF37] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Pickup after Market</p>
                      <p className="text-sm text-muted-foreground">Browns Mill Community Center</p>
                      <p className="text-sm text-muted-foreground">Saturdays 3:00 PM - 6:00 PM</p>
                    </div>
                  </div>
                ) : fulfillmentType === 'pickup_event' ? (
                  <div className="flex items-start gap-2">
                    <Package className="h-5 w-5 text-[#D4AF37] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Pickup at Event</p>
                      <p className="text-sm text-muted-foreground">Next community event</p>
                      <p className="text-sm text-muted-foreground">Details will be sent via SMS/email</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <Truck className="h-5 w-5 text-[#D4AF37] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Delivery</p>
                      <p className="text-sm text-muted-foreground">{deliveryAddress.street}</p>
                      <p className="text-sm text-muted-foreground">
                        {deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.zip}
                      </p>
                      {deliveryTimeSlot && (
                        <p className="text-sm text-muted-foreground">{deliveryTimeSlot}</p>
                      )}
                      {deliveryZone && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Zone: {deliveryZone.name} ({deliveryZone.distance})
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold mb-2">Items</h3>
                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.name} (x{item.quantity})</span>
                      <span>${((item.price * item.quantity) / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coupon Section */}
              <CouponInput
                onCouponApplied={handleCouponApplied}
                onCouponRemoved={handleCouponRemoved}
                appliedCoupon={appliedCoupon}
                orderTotal={subtotal}
                customerEmail={customer.email}
                disabled={isSubmitting}
              />

              {/* Total */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${(subtotal / 100).toFixed(2)}</span>
                </div>
                
                {appliedCoupon && appliedCoupon.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Coupon Discount ({appliedCoupon.code})</span>
                    <span>-${(couponDiscount / 100).toFixed(2)}</span>
                  </div>
                )}
                
                {fulfillmentType === 'delivery' && (
                  <div className="flex justify-between text-sm">
                    <span>
                      Delivery Fee
                      {appliedCoupon?.freeShipping && (
                        <span className="text-green-600 ml-1">(Free with coupon!)</span>
                      )}
                    </span>
                    <span className={appliedCoupon?.freeShipping ? 'line-through text-muted-foreground' : ''}>
                      ${(deliveryFee / 100).toFixed(2)}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-[#D4AF37]">${(total / 100).toFixed(2)}</span>
                </div>
                
                {appliedCoupon && (
                  <div className="text-xs text-green-600 text-center">
                    🎉 You saved ${((couponDiscount + (appliedCoupon.freeShipping ? deliveryFee : 0)) / 100).toFixed(2)} with your coupon!
                  </div>
                )}
              </div>

              {/* Square Payment Form */}
              <SquarePaymentForm
                amount={total / 100} // Convert cents to dollars for Square
                currency="USD"
                orderId={`TOG-${Date.now()}`}
                orderData={{
                  cart,
                  customer,
                  fulfillmentType,
                  deliveryAddress: fulfillmentType === 'delivery' ? deliveryAddress : null,
                  deliveryTimeSlot: fulfillmentType === 'delivery' ? deliveryTimeSlot : null,
                  deliveryInstructions: fulfillmentType === 'delivery' ? deliveryInstructions : null,
                  appliedCoupon,
                  subtotal,
                  couponDiscount,
                  originalDeliveryFee: deliveryFee,
                  adjustedDeliveryFee
                }}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />

              <p className="text-xs text-center text-muted-foreground">
                You'll receive a confirmation via SMS and email
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // This should never be reached in normal flow, but just in case
  return null;
}

// Add the Spin Wheel Modal component that should be rendered across all steps
function SpinWheelModal({ showSpinWheel, setShowSpinWheel, customer, handleSpinWin }) {
  if (!showSpinWheel) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl relative max-w-lg w-full">
        <Button
          onClick={() => setShowSpinWheel(false)}
          variant="ghost"
          className="absolute top-2 right-2 z-10"
        >
          ✕
        </Button>
        <div className="p-6">
          <SpinWheel
            onWin={handleSpinWin}
            customerEmail={customer.email}
          />
        </div>
      </div>
    </div>
  );
}