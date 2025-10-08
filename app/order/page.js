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
import { getDeliveryZoneByZip, calculateDeliveryFee, getDeliveryTimeSlots } from '@/lib/delivery-zones';

export default function OrderPage() {
  const [step, setStep] = useState(1); // 1: Browse, 2: Info, 3: Fulfillment, 4: Review
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [fulfillmentType, setFulfillmentType] = useState('pickup');
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

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (deliveryAddress.zip && deliveryAddress.zip.length === 5) {
      const zone = getDeliveryZoneByZip(deliveryAddress.zip);
      setDeliveryZone(zone);
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const fee = calculateDeliveryFee(deliveryAddress.zip, subtotal);
      setDeliveryFee(fee);
    }
  }, [deliveryAddress.zip, cart]);

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

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal + (fulfillmentType === 'delivery' ? deliveryFee : 0);

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    try {
      const checkoutData = {
        cart,
        customer: {
          ...customer,
          address: fulfillmentType === 'delivery' ? deliveryAddress : null
        },
        fulfillmentType,
        deliveryAddress: fulfillmentType === 'delivery' ? deliveryAddress : null,
        deliveryTimeSlot: fulfillmentType === 'delivery' ? deliveryTimeSlot : null,
        deliveryInstructions: fulfillmentType === 'delivery' ? deliveryInstructions : null
      };

      const response = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutData)
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to create checkout');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to create checkout');
      setIsSubmitting(false);
    }
  };

  // Step 1: Browse Products
  if (step === 1) {
    return (
      <div className=\"min-h-screen bg-gradient-to-b from-[#D4AF37]/5 to-background\">
        {/* Header */}
        <div className=\"bg-white border-b sticky top-0 z-40\">
          <div className=\"container py-4\">
            <div className=\"flex items-center justify-between\">
              <div>
                <h1 className=\"text-2xl font-bold text-gradient-gold\">Taste of Gratitude</h1>
                <p className=\"text-sm text-muted-foreground\">Serenbe Farmers Market</p>
              </div>
              <Button
                onClick={() => cart.length > 0 && setStep(2)}
                className=\"bg-[#D4AF37] hover:bg-[#B8941F] relative\"
                disabled={cart.length === 0}
              >
                <ShoppingCart className=\"mr-2 h-4 w-4\" />
                Cart ({cart.length})
                {cart.length > 0 && (
                  <Badge className=\"ml-2 bg-white text-[#D4AF37]\">
                    ${(subtotal / 100).toFixed(2)}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className=\"container py-8\">
          <div className=\"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6\">
            {products.map(product => (
              <Card key={product.id} className=\"overflow-hidden hover-lift\">
                <div className=\"relative h-48 bg-muted\">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className=\"object-cover\"
                  />
                  {product.stock === 0 ? (
                    <Badge className=\"absolute top-3 right-3 bg-red-600\">
                      Out of Stock
                    </Badge>
                  ) : product.stock <= product.lowStockThreshold ? (
                    <Badge className=\"absolute top-3 right-3 bg-yellow-600\">
                      Only {product.stock} left!
                    </Badge>
                  ) : (
                    <Badge className=\"absolute top-3 right-3 bg-green-600\">
                      In Stock
                    </Badge>
                  )}
                </div>
                <CardHeader>
                  <CardTitle className=\"text-lg\">{product.name}</CardTitle>
                  <p className=\"text-sm text-muted-foreground\">{product.subtitle}</p>
                </CardHeader>
                <CardContent>
                  <div className=\"flex items-center justify-between mb-4\">
                    <span className=\"text-2xl font-bold text-[#D4AF37]\">
                      ${(product.price / 100).toFixed(2)}
                    </span>
                    <span className=\"text-sm text-muted-foreground\">{product.size}</span>
                  </div>
                  {product.stock === 0 ? (
                    <Button variant=\"outline\" className=\"w-full\" disabled>
                      <AlertCircle className=\"mr-2 h-4 w-4\" />
                      Out of Stock
                    </Button>
                  ) : (
                    <Button
                      onClick={() => addToCart(product)}
                      className=\"w-full bg-[#D4AF37] hover:bg-[#B8941F]\"
                    >
                      <Plus className=\"mr-2 h-4 w-4\" />
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
      <div className=\"min-h-screen bg-background p-4\">
        <div className=\"max-w-md mx-auto py-8\">
          <Button variant=\"ghost\" onClick={() => setStep(1)} className=\"mb-4\">
            ← Back to Products
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
              <p className=\"text-sm text-muted-foreground\">
                We'll use this to contact you about your order
              </p>
            </CardHeader>
            <CardContent className=\"space-y-4\">
              <div className=\"space-y-2\">
                <Label htmlFor=\"name\">Name *</Label>
                <Input
                  id=\"name\"
                  value={customer.name}
                  onChange={(e) => setCustomer({...customer, name: e.target.value})}
                  placeholder=\"Jane Smith\"
                  required
                />
              </div>

              <div className=\"space-y-2\">
                <Label htmlFor=\"email\">Email *</Label>
                <Input
                  id=\"email\"
                  type=\"email\"
                  value={customer.email}
                  onChange={(e) => setCustomer({...customer, email: e.target.value})}
                  placeholder=\"jane@example.com\"
                  required
                />
              </div>

              <div className=\"space-y-2\">
                <Label htmlFor=\"phone\">Phone *</Label>
                <Input
                  id=\"phone\"
                  type=\"tel\"
                  value={customer.phone}
                  onChange={(e) => setCustomer({...customer, phone: e.target.value})}
                  placeholder=\"(404) 555-1234\"
                  required
                />
              </div>

              <Button
                onClick={() => setStep(3)}
                className=\"w-full bg-[#D4AF37] hover:bg-[#B8941F]\"
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
      <div className=\"min-h-screen bg-background p-4\">
        <div className=\"max-w-md mx-auto py-8\">
          <Button variant=\"ghost\" onClick={() => setStep(2)} className=\"mb-4\">
            ← Back
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>How would you like to receive your order?</CardTitle>
            </CardHeader>
            <CardContent className=\"space-y-6\">
              <RadioGroup value={fulfillmentType} onValueChange={setFulfillmentType}>
                <div className=\"flex items-start space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted\" onClick={() => setFulfillmentType('pickup')}>
                  <RadioGroupItem value=\"pickup\" id=\"pickup\" />
                  <Label htmlFor=\"pickup\" className=\"flex-1 cursor-pointer\">
                    <div className=\"flex items-center gap-2 mb-1\">
                      <Package className=\"h-5 w-5 text-[#D4AF37]\" />
                      <span className=\"font-semibold\">Pick up at market</span>
                    </div>
                    <p className=\"text-sm text-muted-foreground\">
                      Ready at Booth 12 after 2:00 PM today
                    </p>
                  </Label>
                </div>

                <div className=\"flex items-start space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted\" onClick={() => setFulfillmentType('delivery')}>
                  <RadioGroupItem value=\"delivery\" id=\"delivery\" />
                  <Label htmlFor=\"delivery\" className=\"flex-1 cursor-pointer\">
                    <div className=\"flex items-center gap-2 mb-1\">
                      <Truck className=\"h-5 w-5 text-[#D4AF37]\" />
                      <span className=\"font-semibold\">Delivery</span>
                    </div>
                    <p className=\"text-sm text-muted-foreground\">
                      Atlanta metro area - $5 to $25 based on zone
                    </p>
                  </Label>
                </div>
              </RadioGroup>

              {fulfillmentType === 'delivery' && (
                <div className=\"space-y-4 pt-4 border-t\">
                  <div className=\"space-y-2\">
                    <Label htmlFor=\"street\">Street Address *</Label>
                    <Input
                      id=\"street\"
                      value={deliveryAddress.street}
                      onChange={(e) => setDeliveryAddress({...deliveryAddress, street: e.target.value})}
                      placeholder=\"123 Main St\"
                      required
                    />
                  </div>

                  <div className=\"grid grid-cols-3 gap-2\">
                    <div className=\"col-span-1 space-y-2\">
                      <Label htmlFor=\"zip\">Zip *</Label>
                      <Input
                        id=\"zip\"
                        value={deliveryAddress.zip}
                        onChange={(e) => setDeliveryAddress({...deliveryAddress, zip: e.target.value})}
                        placeholder=\"30344\"
                        maxLength={5}
                        required
                      />
                    </div>
                    <div className=\"col-span-2 space-y-2\">
                      <Label htmlFor=\"city\">City</Label>
                      <Input
                        id=\"city\"
                        value={deliveryAddress.city}
                        onChange={(e) => setDeliveryAddress({...deliveryAddress, city: e.target.value})}
                        placeholder=\"Atlanta\"
                      />
                    </div>
                  </div>

                  {deliveryZone && (
                    <div className=\"p-4 bg-[#D4AF37]/10 rounded-lg\">
                      <p className=\"text-sm font-semibold\">Delivery Zone: {deliveryZone.name}</p>
                      <p className=\"text-sm text-muted-foreground\">Distance: {deliveryZone.distance}</p>
                      <p className=\"text-sm text-muted-foreground\">Est. Time: {deliveryZone.estimatedTime}</p>
                      <p className=\"text-lg font-bold text-[#D4AF37] mt-2\">
                        Delivery Fee: ${(deliveryFee / 100).toFixed(2)}
                        {deliveryFee === 0 && subtotal >= deliveryZone.freeThreshold && (
                          <Badge className=\"ml-2 bg-green-600\">FREE!</Badge>
                        )}
                      </p>
                    </div>
                  )}

                  <div className=\"space-y-2\">
                    <Label htmlFor=\"timeSlot\">Delivery Time</Label>
                    <Select value={deliveryTimeSlot} onValueChange={setDeliveryTimeSlot}>
                      <SelectTrigger>
                        <SelectValue placeholder=\"Select time slot\" />
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

                  <div className=\"space-y-2\">
                    <Label htmlFor=\"instructions\">Delivery Instructions (optional)</Label>
                    <Textarea
                      id=\"instructions\"
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                      placeholder=\"e.g., Leave at front door, ring bell\"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={() => setStep(4)}
                className=\"w-full bg-[#D4AF37] hover:bg-[#B8941F]\"
                disabled={fulfillmentType === 'delivery' && (!deliveryAddress.street || !deliveryAddress.zip || !deliveryTimeSlot)}
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
      <div className=\"min-h-screen bg-background p-4\">
        <div className=\"max-w-md mx-auto py-8\">
          <Button variant=\"ghost\" onClick={() => setStep(3)} className=\"mb-4\">
            ← Back
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Review Your Order</CardTitle>
            </CardHeader>
            <CardContent className=\"space-y-6\">
              {/* Customer */}
              <div>
                <h3 className=\"font-semibold mb-2\">Customer</h3>
                <p className=\"text-sm text-muted-foreground\">{customer.name}</p>
                <p className=\"text-sm text-muted-foreground\">{customer.email}</p>
                <p className=\"text-sm text-muted-foreground\">{customer.phone}</p>
              </div>

              {/* Fulfillment */}
              <div>
                <h3 className=\"font-semibold mb-2\">Fulfillment</h3>
                {fulfillmentType === 'pickup' ? (
                  <div className=\"flex items-start gap-2\">
                    <Package className=\"h-5 w-5 text-[#D4AF37] mt-0.5\" />
                    <div>
                      <p className=\"text-sm font-medium\">Pickup at Market</p>
                      <p className=\"text-sm text-muted-foreground\">Booth 12, after 2:00 PM</p>
                    </div>
                  </div>
                ) : (
                  <div className=\"flex items-start gap-2\">
                    <Truck className=\"h-5 w-5 text-[#D4AF37] mt-0.5\" />
                    <div>
                      <p className=\"text-sm font-medium\">Delivery</p>
                      <p className=\"text-sm text-muted-foreground\">{deliveryAddress.street}</p>
                      <p className=\"text-sm text-muted-foreground\">
                        {deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.zip}
                      </p>
                      <p className=\"text-sm text-muted-foreground\">{deliveryTimeSlot}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <h3 className=\"font-semibold mb-2\">Items</h3>
                <div className=\"space-y-2\">
                  {cart.map(item => (
                    <div key={item.id} className=\"flex justify-between text-sm\">
                      <span>{item.name} (x{item.quantity})</span>
                      <span>${((item.price * item.quantity) / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className=\"border-t pt-4 space-y-2\">
                <div className=\"flex justify-between text-sm\">
                  <span>Subtotal</span>
                  <span>${(subtotal / 100).toFixed(2)}</span>
                </div>
                {fulfillmentType === 'delivery' && (
                  <div className=\"flex justify-between text-sm\">
                    <span>Delivery Fee</span>
                    <span>${(deliveryFee / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className=\"flex justify-between text-lg font-bold\">
                  <span>Total</span>
                  <span className=\"text-[#D4AF37]\">${(total / 100).toFixed(2)}</span>
                </div>
              </div>

              <Button
                onClick={handleSubmitOrder}
                className=\"w-full bg-[#D4AF37] hover:bg-[#B8941F]\"
                disabled={isSubmitting}
                size=\"lg\"
              >
                {isSubmitting ? 'Placing Order...' : 'Place Order'}
              </Button>

              <p className=\"text-xs text-center text-muted-foreground\">
                You'll receive a confirmation via SMS and email
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
