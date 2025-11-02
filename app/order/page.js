'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  ShoppingCart, 
  Truck, 
  MapPin, 
  Clock, 
  CreditCard,
  Package,
  Star,
  Gift,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Loader2,
  AlertCircle,
  X,
  Lock,
  Shield
} from 'lucide-react';
import ProductImage from '@/components/ProductImage';
import CouponInput from '@/components/CouponInput';
import SpinWheel from '@/components/SpinWheel';
import SquareWebPaymentForm from '@/components/SquareWebPaymentForm';
import { PRODUCTS } from '@/lib/products';

// Delivery zones configuration
const DELIVERY_ZONES = {
  zone1: { name: 'Atlanta Metro', fee: 15, timeSlots: ['9:00-11:00 AM', '11:00-1:00 PM', '1:00-3:00 PM', '3:00-5:00 PM'] },
  zone2: { name: 'Decatur/DeKalb', fee: 12, timeSlots: ['10:00-12:00 PM', '12:00-2:00 PM', '2:00-4:00 PM', '4:00-6:00 PM'] },
  zone3: { name: 'South Atlanta', fee: 18, timeSlots: ['9:00-12:00 PM', '12:00-3:00 PM', '3:00-6:00 PM'] }
};

// Fulfillment options - Read from environment
const FULFILLMENT_OPTIONS = {
  pickup_market: {
    label: 'Pick up at Market',
    description: 'Serenbe Farmers Market - Saturdays 9:00 AM - 1:00 PM',
    fee: 0,
    icon: Package,
    enabled: process.env.NEXT_PUBLIC_FULFILLMENT_PICKUP === 'enabled'
  },
  shipping: {
    label: 'Shipping',
    description: 'USPS Priority Mail - 2-3 business days',
    fee: 8.99,
    freeShippingThreshold: 50,
    icon: MapPin,
    enabled: process.env.NEXT_PUBLIC_FULFILLMENT_SHIPPING === 'enabled'
  },
  delivery: {
    label: 'Home Delivery',
    description: 'Local delivery available to select South Fulton and Atlanta ZIP codes today.',
    tooltip: "Same-day delivery to your door with flexible time windows",
    fee: 'varies',
    icon: Truck,
    enabled: process.env.NEXT_PUBLIC_FULFILLMENT_DELIVERY === 'enabled'
  }
};

// Markets for pickup
const PICKUP_MARKETS = [
  {
    id: 'serenbe',
    name: 'Serenbe Farmers Market',
    schedule: 'Saturdays 9:00 AM - 1:00 PM',
    location: '10950 Hutcheson Ferry Rd, Palmetto, GA 30268',
    booth: 'Look for the Taste of Gratitude booth near the entrance'
  },
  {
    id: 'east-atlanta',
    name: 'East Atlanta Village Market',
    schedule: 'Sundays 11:00 AM - 4:00 PM',
    location: '477 Flat Shoals Ave SE, Atlanta, GA 30316',
    booth: 'Find us in the covered pavilion area'
  }
];

// Shipping rates by state
const SHIPPING_RATES = {
  'GA': 8.99,
  'AL': 9.99,
  'FL': 9.99,
  'TN': 9.99,
  'SC': 9.99,
  'NC': 10.99,
  'default': 12.99
};

const FREE_SHIPPING_THRESHOLD = 50;

export default function OrderPage() {
  // Core state management
  const [step, setStep] = useState(1);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '' });
  const [fulfillmentType, setFulfillmentType] = useState('');
  
  // Pickup state
  const [pickupMarket, setPickupMarket] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  
  // Shipping state
  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: 'GA',
    zip: ''
  });
  
  // Legacy delivery state (disabled)
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    city: '',
    state: 'GA',
    zip: ''
  });
  const [deliveryZone, setDeliveryZone] = useState('');
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [deliveryTip, setDeliveryTip] = useState(0);
  const [customTipAmount, setCustomTipAmount] = useState('');
  const [deliveryZipValid, setDeliveryZipValid] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [orderId, setOrderId] = useState(null); // Stable order ID for payment

  // Coupon and rewards state
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [userPassport, setUserPassport] = useState(null);

  // Load saved data on component mount
  useEffect(() => {
    loadSavedData();
    setIsHydrated(true);
  }, []);

  // REMOVED auto-save useEffect to prevent race condition with React 19
  // Manual saves are now done in each state update function

  // Load user passport when customer email changes
  useEffect(() => {
    if (customer.email) {
      loadUserPassport(customer.email);
    }
  }, [customer.email]);

  // Generate stable order ID when reaching Step 4
  useEffect(() => {
    if (step === 4 && !orderId) {
      setOrderId(`ORDER-${Date.now()}`);
    }
  }, [step, orderId]);

  const loadSavedData = () => {
    try {
      const savedCart = localStorage.getItem('taste-of-gratitude-cart');
      const savedCustomer = localStorage.getItem('taste-of-gratitude-customer');
      
      if (savedCart) setCart(JSON.parse(savedCart));
      if (savedCustomer) setCustomer(JSON.parse(savedCustomer));
      
      // NOTE: Step is NOT persisted - checkout should restart from Step 1 on page reload
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  const saveDataToLocal = () => {
    try {
      localStorage.setItem('taste-of-gratitude-cart', JSON.stringify(cart));
      localStorage.setItem('taste-of-gratitude-customer', JSON.stringify(customer));
      // NOTE: Step is NOT saved - prevents React 19 Strict Mode race condition
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const loadUserPassport = async (email) => {
    try {
      const response = await fetch('/api/rewards/passport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: customer.name })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserPassport(data.passport);
        }
      }
    } catch (error) {
      console.error('Error loading user passport:', error);
    }
  };

  // Cart management - Fixed for React 19 with manual localStorage save
  const addToCart = (product, size = 'Regular', quantity = 1) => {
    if (!product || !product.slug) {
      console.error('Invalid product:', product);
      toast.error('Invalid product');
      return;
    }
    
    const cartItem = {
      id: `${product.slug}_${size}`,
      slug: product.slug,
      name: product.name,
      price: product.price,
      size: product.size || size,
      quantity,
      image: product.image || product.images?.[0],
      category: product.category,
      rewardPoints: product.rewardPoints || Math.floor(product.price),
      squareProductUrl: product.squareProductUrl
    };
    
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === cartItem.id);
      let newCart;
      if (existingItem) {
        newCart = prevCart.map(item => 
          item.id === cartItem.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        newCart = [...prevCart, cartItem];
      }
      
      // Save immediately after state calculation
      try {
        localStorage.setItem('taste-of-gratitude-cart', JSON.stringify(newCart));
      } catch (e) {
        console.error('Failed to save cart:', e);
      }
      
      return newCart;
    });
    
    toast.success(`Added ${product.name} to cart`);
  };

  const updateCartItemQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    setCart(prevCart => {
      const newCart = prevCart.map(item => 
        item.id === itemId 
          ? { ...item, quantity: newQuantity }
          : item
      );
      
      // Save to localStorage
      try {
        localStorage.setItem('taste-of-gratitude-cart', JSON.stringify(newCart));
      } catch (e) {
        console.error('Failed to save cart:', e);
      }
      
      return newCart;
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prevCart => {
      const newCart = prevCart.filter(item => item.id !== itemId);
      
      // Save to localStorage
      try {
        localStorage.setItem('taste-of-gratitude-cart', JSON.stringify(newCart));
      } catch (e) {
        console.error('Failed to save cart:', e);
      }
      
      return newCart;
    });
    toast.success('Item removed from cart');
  };

  // Price calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
  
  // Calculate shipping/delivery fee
  const getShippingFee = () => {
    if (fulfillmentType === 'pickup_market') return 0;
    if (fulfillmentType === 'shipping') {
      // Free shipping over threshold
      if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
      // Calculate based on state
      const state = shippingAddress.state;
      return SHIPPING_RATES[state] || SHIPPING_RATES.default;
    }
    if (fulfillmentType === 'delivery') {
      // Calculate delivery fee based on subtotal and free delivery threshold
      const freeDeliveryThreshold = parseFloat(process.env.NEXT_PUBLIC_DELIVERY_FREE_THRESHOLD || '75');
      const baseFee = parseFloat(process.env.NEXT_PUBLIC_DELIVERY_BASE_FEE || '6.99');
      return subtotal >= freeDeliveryThreshold ? 0 : baseFee;
    }
    return 0;
  };
  
  const shippingFee = getShippingFee();
  const adjustedShippingFee = appliedCoupon?.type === 'free_delivery' || appliedCoupon?.type === 'free_shipping' ? 0 : shippingFee;
  const total = subtotal - couponDiscount + adjustedShippingFee + (fulfillmentType === 'delivery' ? deliveryTip : 0);
  
  // Calculate free shipping progress
  const freeShippingProgress = fulfillmentType === 'shipping' && subtotal < FREE_SHIPPING_THRESHOLD
    ? {
        remaining: FREE_SHIPPING_THRESHOLD - subtotal,
        percentage: (subtotal / FREE_SHIPPING_THRESHOLD) * 100
      }
    : null;

  const getDeliveryFee = () => {
    if (!deliveryZone || fulfillmentType !== 'delivery') return 0;
    return DELIVERY_ZONES[deliveryZone]?.fee || 15;
  };

  // Validation functions
  const validateStep = (stepNumber) => {
    const newErrors = {};
    
    switch (stepNumber) {
      case 1:
        if (cart.length === 0) {
          newErrors.cart = 'Please add items to your cart';
        }
        break;
        
      case 2:
        if (!customer.name.trim()) newErrors.name = 'Name is required';
        if (!customer.email.trim()) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(customer.email)) newErrors.email = 'Valid email is required';
        if (!customer.phone.trim()) newErrors.phone = 'Phone number is required';
        break;
        
      case 3:
        if (!fulfillmentType) {
          newErrors.fulfillment = 'Please select a fulfillment option';
        }
        
        // Block delivery attempts
        if (fulfillmentType === 'delivery') {
          newErrors.fulfillment = 'Home Delivery is temporarily unavailable. Please choose Pickup or Shipping.';
        }
        
        // Validate pickup
        if (fulfillmentType === 'pickup_market') {
          if (!pickupMarket) newErrors.pickupMarket = 'Please select a market location';
          if (!pickupDate) newErrors.pickupDate = 'Please select a pickup date';
        }
        
        // Validate shipping
        if (fulfillmentType === 'shipping') {
          if (!shippingAddress.street.trim()) newErrors.shippingStreet = 'Street address is required';
          if (!shippingAddress.city.trim()) newErrors.shippingCity = 'City is required';
          if (!shippingAddress.zip.trim()) newErrors.shippingZip = 'ZIP code is required';
          else if (!/^\d{5}(-\d{4})?$/.test(shippingAddress.zip.trim())) {
            newErrors.shippingZip = 'Please enter a valid ZIP code';
          }
        }
        
        // Legacy delivery validation (should not reach here due to block above)
        if (fulfillmentType === 'delivery') {
          if (!deliveryAddress.street.trim()) newErrors.street = 'Street address is required';
          if (!deliveryAddress.city.trim()) newErrors.city = 'City is required';
          if (!deliveryAddress.zip.trim()) newErrors.zip = 'ZIP code is required';
          if (!deliveryZone) newErrors.zone = 'Please select a delivery zone';
          if (!deliveryTimeSlot) newErrors.timeSlot = 'Please select a delivery time';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    console.log('nextStep called, current step:', step, 'cart length:', cart.length);
    
    if (validateStep(step)) {
      const newStep = Math.min(step + 1, 4);
      console.log('Validation passed, setting new step:', newStep);
      setStep(newStep);
      
      // Scroll to top of page after step change
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } else {
      console.log('Validation failed for step:', step, 'errors:', errors);
      toast.error('Please complete all required fields');
    }
  };

  const prevStep = () => {
    const newStep = Math.max(step - 1, 1);
    setStep(newStep);
    
    // Scroll to top of page after step change
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  // Coupon handling
  const handleCouponApply = (coupon) => {
    setAppliedCoupon(coupon);
    toast.success(`Coupon "${coupon.code}" applied! $${coupon.discount} off`);
  };

  const handleCouponRemove = () => {
    setAppliedCoupon(null);
    toast.success('Coupon removed');
  };

  // Spin wheel handling
  const handleSpinWin = async (prize) => {
    try {
      // Award spin points
      if (customer.email) {
        await fetch('/api/rewards/add-points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: customer.email,
            points: 10,
            activityType: 'spin_wheel_win',
            activityData: { prize: prize.label, discount: prize.discount }
          })
        });
      }
      
      // Apply the coupon
      const spinCoupon = {
        code: `SPIN${Date.now()}`,
        discount: prize.discount,
        type: 'spin_wheel',
        description: `Spin & Win: $${prize.discount} off`
      };
      
      setAppliedCoupon(spinCoupon);
      setShowSpinWheel(false);
      
      toast.success(`🎉 You won $${prize.discount} off your order!`);
    } catch (error) {
      console.error('Error processing spin win:', error);
      toast.error('Error processing your prize. Please try again.');
    }
  };

  // Clear all data
  const clearCart = () => {
    setCart([]);
    setStep(1);
    setCustomer({ name: '', email: '', phone: '' });
    localStorage.removeItem('taste-of-gratitude-cart');
    localStorage.removeItem('taste-of-gratitude-customer');
  };

  // Enhanced checkout process - Redirect to Square Online for payment
  const handleCheckout = async () => {
    // Block delivery attempts
    if (fulfillmentType === 'delivery') {
      toast.error('Home Delivery is temporarily unavailable. Please choose Pickup or Shipping.');
      setErrors({ fulfillment: 'Home Delivery is temporarily unavailable. Please choose Pickup or Shipping.' });
      setStep(3); // Go back to fulfillment selection
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare fulfillment data based on type
      let fulfillmentData = {};
      
      if (fulfillmentType === 'pickup_market') {
        fulfillmentData = {
          type: 'pickup_market',
          market: pickupMarket,
          pickupDate: pickupDate,
          marketDetails: PICKUP_MARKETS.find(m => m.id === pickupMarket)
        };
      } else if (fulfillmentType === 'shipping') {
        fulfillmentData = {
          type: 'shipping',
          address: shippingAddress,
          estimatedDelivery: '2-3 business days'
        };
      }
      
      // Generate order ID
      const orderId = `ORDER-${Date.now()}`;
      
      // Award order initiation points
      if (customer.email) {
        try {
          await fetch('/api/rewards/add-points', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: customer.email,
              points: 5,
              activityType: 'checkout_started',
              activityData: {
                orderId,
                itemCount: cart.length,
                total: total
              }
            })
          });
        } catch (pointsError) {
          console.warn('Failed to award checkout points:', pointsError);
        }
      }
      
      // Convert cart to Square line items format
      const lineItems = cart.map(item => ({
        catalogObjectId: item.catalogObjectId || item.squareVariationId,
        quantity: item.quantity,
        name: item.name,
        basePriceMoney: {
          amount: Math.round(item.price * 100), // Convert to cents
          currency: 'USD'
        },
        productId: item.id,
        category: item.category,
        size: item.size
      }));
      
      // Create Square Payment Link via our API
      toast.loading('Creating secure checkout...', { id: 'checkout-loading' });
      
      const checkoutResponse = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineItems,
          redirectUrl: `${window.location.origin}/checkout/success`,
          customer: {
            email: customer.email,
            name: customer.name,
            phone: customer.phone
          },
          orderId,
          fulfillmentType,
          deliveryAddress: fulfillmentType === 'shipping' ? shippingAddress : null
        })
      });
      
      const checkoutData = await checkoutResponse.json();
      
      if (!checkoutResponse.ok || !checkoutData.success) {
        throw new Error(checkoutData.error || 'Failed to create checkout');
      }
      
      // Store order reference
      const orderData = {
        id: orderId,
        squareOrderId: checkoutData.paymentLink.orderId,
        paymentLinkId: checkoutData.paymentLink.id,
        cart,
        customer,
        fulfillmentType,
        fulfillmentData,
        deliveryAddress: fulfillmentType === 'shipping' ? shippingAddress : null,
        shippingFee: adjustedShippingFee,
        appliedCoupon,
        subtotal,
        couponDiscount,
        total,
        source: 'website',
        status: 'pending_payment',
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem('pendingOrder', JSON.stringify(orderData));
      
      // Redirect to Square Hosted Checkout
      toast.success('Redirecting to secure checkout...', { id: 'checkout-loading' });
      
      setTimeout(() => {
        window.location.href = checkoutData.paymentLink.url;
      }, 500);
      
    } catch (error) {
      console.error('Checkout failed:', error);
      toast.error(error.message || 'Checkout failed. Please try again.');
      setIsSubmitting(false);
    }
  };
  
  // Build Square Online cart URL with all items
  
  // Check if customer qualifies for spin wheel
  const checkSpinWheelEligibility = () => {
    // First order $15+ OR repeat orders $20+
    const isFirstOrder = !customer.email || !userPassport || userPassport.totalOrders === 0;
    
    if (isFirstOrder && total >= 15) {
      return true; // First order $15+
    }
    
    if (!isFirstOrder && total >= 20) {
      return true; // Repeat order $20+
    }
    
    return false;
  };
  
  // Step 1: Product Selection
  const renderProductSelection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Select Products
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRODUCTS.slice(0, 9).map((product) => (
            <Card key={product.slug} className="group cursor-pointer hover:shadow-lg transition-all">
              <CardContent className="p-4">
                <div className="aspect-square mb-3 overflow-hidden rounded-lg bg-gray-100">
                  <img 
                    src={product.image || product.images?.[0]} 
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                
                <h3 className="font-semibold text-sm mb-1">{product.name}</h3>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
                
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-[#D4AF37]">${product.price}</span>
                  {product.rewardPoints && (
                    <Badge variant="secondary" className="text-xs">
                      +{product.rewardPoints} pts
                    </Badge>
                  )}
                </div>
                
                <Button 
                  onClick={() => addToCart(product)}
                  size="sm" 
                  className="w-full bg-[#D4AF37] hover:bg-[#B8941F]"
                >
                  Add to Cart
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Current Cart */}
        {cart.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">Your Cart ({cart.length} items)</h3>
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.size}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                    >
                      -
                    </Button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <Button
                      onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                    >
                      +
                    </Button>
                    <Button
                      onClick={() => removeFromCart(item.id)}
                      size="sm"
                      variant="destructive"
                      className="h-7 w-16 text-xs ml-2"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-[#D4AF37]/10 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Subtotal:</span>
                <span className="font-bold text-[#D4AF37]">${subtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
        
        {errors.cart && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            {errors.cart}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Step 2: Customer Information
  const renderCustomerInfo = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Customer Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {userPassport && (
          <div className="p-4 bg-gradient-to-r from-[#D4AF37]/5 to-[#D4AF37]/10 rounded-lg border border-[#D4AF37]/20">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{userPassport.levelInfo?.emoji || '🌱'}</span>
              <div>
                <div className="font-semibold text-sm">{userPassport.levelInfo?.name || 'Explorer'}</div>
                <div className="text-xs text-muted-foreground">{userPassport.points || 0} reward points</div>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              data-testid="customer-name-input"
              value={customer.name}
              onChange={(e) => setCustomer(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter your full name"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <span className="text-red-500 text-xs">{errors.name}</span>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              data-testid="customer-phone-input"
              value={customer.phone}
              onChange={(e) => setCustomer(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="(555) 123-4567"
              className={errors.phone ? 'border-red-500' : ''}
            />
            {errors.phone && <span className="text-red-500 text-xs">{errors.phone}</span>}
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            data-testid="customer-email-input"
            value={customer.email}
            onChange={(e) => setCustomer(prev => ({ ...prev, email: e.target.value }))}
            placeholder="your@email.com"
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && <span className="text-red-500 text-xs">{errors.email}</span>}
        </div>
        
        {/* Spin & Win Section - MOVED TO POST-PURCHASE
        {customer.email && !appliedCoupon && (
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm mb-1">🎰 Spin & Win a Discount!</h3>
                <p className="text-xs text-muted-foreground">Get a chance to win up to $10 off your order</p>
              </div>
              <Button
                onClick={() => setShowSpinWheel(true)}
                size="sm"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Gift className="mr-2 h-4 w-4" />
                Spin Now
              </Button>
            </div>
          </div>
        )}
        */}
        
        {/* Info: Earn spins after purchase */}
        {customer.email && (
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-600" />
              <div className="text-sm">
                <span className="font-semibold text-purple-800">Complete your order to earn spins!</span>
                <p className="text-xs text-purple-600 mt-1">
                  $15+ first order = 1 spin • $20+ orders = 1 spin per $20 • Spins stack and never expire!
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Step 3: Fulfillment Options
  const renderFulfillmentOptions = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Fulfillment Options
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <RadioGroup 
          value={fulfillmentType} 
          onValueChange={(value) => {
            setFulfillmentType(value);
          }}
        >
          {Object.entries(FULFILLMENT_OPTIONS).map(([key, option]) => {
            const IconComponent = option.icon;
            const isDisabled = !option.enabled;
            
            return (
              <div 
                key={key} 
                className={`flex items-start space-x-3 p-4 border rounded-lg transition-colors ${
                  isDisabled 
                    ? 'bg-muted/30 opacity-60 cursor-not-allowed' 
                    : 'hover:bg-muted/50 cursor-pointer'
                }`}
              >
                <RadioGroupItem 
                  value={key} 
                  id={key} 
                  className="mt-1" 
                  disabled={isDisabled}
                  aria-disabled={isDisabled}
                  aria-describedby={isDisabled ? `${key}-disabled-message` : undefined}
                />
                <div 
                  className="flex-1" 
                  onClick={() => {
                    if (!isDisabled) {
                      setFulfillmentType(key);
                    }
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <IconComponent className="h-4 w-4" />
                    <Label 
                      htmlFor={key} 
                      className={`font-medium ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {option.label}
                    </Label>
                    {option.fee === 0 && <Badge variant="secondary">Free</Badge>}
                    {isDisabled && <Badge variant="destructive" className="text-xs">Unavailable</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                  {typeof option.fee === 'number' && option.fee > 0 && (
                    <p className="text-sm font-medium text-[#D4AF37] mt-1">
                      ${option.fee.toFixed(2)} {key === 'shipping' && <span className="text-xs text-muted-foreground">(Free over $50)</span>}
                    </p>
                  )}
                  {option.tooltip && !isDisabled && (
                    <p id={`${key}-tooltip`} className="text-xs text-muted-foreground mt-2 italic">
                      💡 {option.tooltip}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </RadioGroup>
        
        {errors.fulfillment && (
          <div className="flex items-center gap-2 text-red-600 text-sm p-3 bg-red-50 rounded-lg border border-red-200">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errors.fulfillment}</span>
          </div>
        )}
        
        {/* Free Shipping Progress */}
        {fulfillmentType === 'shipping' && freeShippingProgress && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-green-900">
                Add ${freeShippingProgress.remaining.toFixed(2)} more for free shipping!
              </p>
              <Gift className="h-4 w-4 text-green-600" />
            </div>
            <div className="w-full bg-green-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(freeShippingProgress.percentage, 100)}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Pickup Market Selection */}
        {fulfillmentType === 'pickup_market' && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <h3 className="font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" />
              Select Pickup Location
            </h3>
            
            <RadioGroup value={pickupMarket} onValueChange={setPickupMarket}>
              {PICKUP_MARKETS.map((market) => (
                <div key={market.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value={market.id} id={`market-${market.id}`} className="mt-1" />
                  <div className="flex-1 cursor-pointer" onClick={() => setPickupMarket(market.id)}>
                    <Label htmlFor={`market-${market.id}`} className="font-medium cursor-pointer">
                      {market.name}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {market.schedule}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3 inline mr-1" />
                      {market.location}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      📍 {market.booth}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
            {errors.pickupMarket && <span className="text-red-500 text-xs">{errors.pickupMarket}</span>}
            
            {/* Pickup Date */}
            {pickupMarket && (
              <div className="space-y-2">
                <Label htmlFor="pickupDate">Preferred Pickup Date *</Label>
                <Input
                  id="pickupDate"
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={errors.pickupDate ? 'border-red-500' : ''}
                />
                {errors.pickupDate && <span className="text-red-500 text-xs">{errors.pickupDate}</span>}
              </div>
            )}
          </div>
        )}
        
        {/* Shipping Address Form */}
        {fulfillmentType === 'shipping' && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Shipping Address
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="shippingStreet">Street Address *</Label>
              <Input
                id="shippingStreet"
                value={shippingAddress.street}
                onChange={(e) => setShippingAddress(prev => ({ ...prev, street: e.target.value }))}
                placeholder="123 Main Street"
                className={errors.shippingStreet ? 'border-red-500' : ''}
              />
              {errors.shippingStreet && <span className="text-red-500 text-xs">{errors.shippingStreet}</span>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shippingCity">City *</Label>
                <Input
                  id="shippingCity"
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Atlanta"
                  className={errors.shippingCity ? 'border-red-500' : ''}
                />
                {errors.shippingCity && <span className="text-red-500 text-xs">{errors.shippingCity}</span>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="shippingState">State *</Label>
                <Select value={shippingAddress.state} onValueChange={(value) => setShippingAddress(prev => ({ ...prev, state: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GA">Georgia</SelectItem>
                    <SelectItem value="AL">Alabama</SelectItem>
                    <SelectItem value="FL">Florida</SelectItem>
                    <SelectItem value="TN">Tennessee</SelectItem>
                    <SelectItem value="SC">South Carolina</SelectItem>
                    <SelectItem value="NC">North Carolina</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="shippingZip">ZIP Code *</Label>
                <Input
                  id="shippingZip"
                  value={shippingAddress.zip}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, zip: e.target.value }))}
                  placeholder="30309"
                  maxLength={10}
                  className={errors.shippingZip ? 'border-red-500' : ''}
                />
                {errors.shippingZip && <span className="text-red-500 text-xs">{errors.shippingZip}</span>}
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <Shield className="h-3 w-3 inline mr-1" />
                Estimated delivery: 2-3 business days via USPS Priority Mail
              </p>
            </div>
          </div>
        )}
        
        {/* Home Delivery Form */}
        {fulfillmentType === 'delivery' && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <h3 className="font-semibold flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Delivery Details
            </h3>
            
            {/* ZIP Code Validation */}
            <div className="space-y-2">
              <Label htmlFor="deliveryZip">Delivery ZIP Code *</Label>
              <div className="flex gap-2">
                <Input
                  id="deliveryZip"
                  value={deliveryAddress.zip}
                  onChange={(e) => {
                    const zip = e.target.value.replace(/\D/g, '').slice(0, 5);
                    setDeliveryAddress(prev => ({ ...prev, zip }));
                    
                    // Validate ZIP in real-time
                    if (zip.length === 5) {
                      const zipWhitelist = (process.env.NEXT_PUBLIC_DELIVERY_ZIP_WHITELIST || '').split(',');
                      const isValid = zipWhitelist.includes(zip);
                      setDeliveryZipValid(isValid);
                      
                      if (!isValid) {
                        toast.error("We're not in your area yet. Try Pickup or Shipping, or use a different address.");
                      } else {
                        toast.success('Delivery available in your area!');
                      }
                    } else {
                      setDeliveryZipValid(null);
                    }
                  }}
                  placeholder="30310"
                  maxLength={5}
                  className={errors.deliveryZip ? 'border-red-500' : deliveryZipValid === false ? 'border-red-500' : deliveryZipValid === true ? 'border-green-500' : ''}
                />
                {deliveryZipValid === true && (
                  <CheckCircle className="h-10 w-10 text-green-600 flex-shrink-0" />
                )}
                {deliveryZipValid === false && (
                  <X className="h-10 w-10 text-red-600 flex-shrink-0" />
                )}
              </div>
              {errors.deliveryZip && <span className="text-red-500 text-xs">{errors.deliveryZip}</span>}
              {deliveryZipValid === false && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Delivery not available in your area. Available ZIPs: South Fulton & Atlanta (30310-30318, 30331-30349)
                </p>
              )}
            </div>
            
            {/* Street Address */}
            <div className="space-y-2">
              <Label htmlFor="deliveryStreet">Street Address *</Label>
              <Input
                id="deliveryStreet"
                value={deliveryAddress.street}
                onChange={(e) => setDeliveryAddress(prev => ({ ...prev, street: e.target.value }))}
                placeholder="123 Main Street"
                className={errors.deliveryStreet ? 'border-red-500' : ''}
              />
              {errors.deliveryStreet && <span className="text-red-500 text-xs">{errors.deliveryStreet}</span>}
            </div>
            
            {/* Apt/Unit */}
            <div className="space-y-2">
              <Label htmlFor="deliveryApt">Apt/Suite (Optional)</Label>
              <Input
                id="deliveryApt"
                value={deliveryAddress.apt || ''}
                onChange={(e) => setDeliveryAddress(prev => ({ ...prev, apt: e.target.value }))}
                placeholder="Apt 4B"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deliveryCity">City *</Label>
                <Input
                  id="deliveryCity"
                  value={deliveryAddress.city}
                  onChange={(e) => setDeliveryAddress(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Atlanta"
                  className={errors.deliveryCity ? 'border-red-500' : ''}
                />
                {errors.deliveryCity && <span className="text-red-500 text-xs">{errors.deliveryCity}</span>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="deliveryState">State *</Label>
                <Select
                  value={deliveryAddress.state}
                  onValueChange={(value) => setDeliveryAddress(prev => ({ ...prev, state: value }))}
                >
                  <SelectTrigger id="deliveryState">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GA">Georgia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Delivery Window */}
            <div className="space-y-2">
              <Label htmlFor="deliveryWindow">Delivery Time Window *</Label>
              <Select
                value={deliveryTimeSlot}
                onValueChange={setDeliveryTimeSlot}
              >
                <SelectTrigger id="deliveryWindow" className={errors.deliveryTimeSlot ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select delivery time" />
                </SelectTrigger>
                <SelectContent>
                  {(process.env.NEXT_PUBLIC_DELIVERY_WINDOWS || '09:00-12:00|12:00-15:00|15:00-18:00')
                    .split('|')
                    .map((window) => (
                      <SelectItem key={window} value={window}>
                        <Clock className="h-3 w-3 inline mr-2" />
                        {window}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.deliveryTimeSlot && <span className="text-red-500 text-xs">{errors.deliveryTimeSlot}</span>}
            </div>
            
            {/* Delivery Instructions */}
            <div className="space-y-2">
              <Label htmlFor="deliveryInstructions">Delivery Instructions (Optional)</Label>
              <Input
                id="deliveryInstructions"
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value.slice(0, 200))}
                placeholder="e.g., Leave at front door, Ring doorbell"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">{deliveryInstructions.length}/200 characters</p>
            </div>
            
            {/* Delivery Fee Progress */}
            {subtotal < 75 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-green-900">
                    Add ${(75 - subtotal).toFixed(2)} for Free Delivery!
                  </p>
                  <Gift className="h-4 w-4 text-green-600" />
                </div>
                <div className="w-full bg-green-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((subtotal / 75) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-green-700 mt-2">
                  Current delivery fee: ${subtotal >= 75 ? '0.00' : process.env.NEXT_PUBLIC_DELIVERY_BASE_FEE || '6.99'}
                </p>
              </div>
            )}
            
            {subtotal >= 75 && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-green-900">
                  🎉 You qualify for Free Delivery!
                </p>
              </div>
            )}
            
            {/* Tip Selection */}
            <div className="space-y-3">
              <Label>Add a Tip for Your Driver (Optional)</Label>
              <div className="grid grid-cols-4 gap-2">
                {[0, 2, 4, 6].map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant={deliveryTip === amount ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setDeliveryTip(amount);
                      setCustomTipAmount('');
                    }}
                    className="w-full"
                  >
                    {amount === 0 ? 'No Tip' : `$${amount}`}
                  </Button>
                ))}
              </div>
              
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={customTipAmount}
                    onChange={(e) => {
                      setCustomTipAmount(e.target.value);
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0) {
                        setDeliveryTip(val);
                      }
                    }}
                    placeholder="Custom amount"
                    className="text-sm"
                  />
                </div>
              </div>
              
              {deliveryTip > 0 && (
                <p className="text-xs text-muted-foreground">
                  💚 Thank you for supporting our delivery drivers!
                </p>
              )}
            </div>
            
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <Shield className="h-3 w-3 inline mr-1" />
                Same-day delivery • Contactless delivery available • Track your order in real-time
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Step 4: Review & Payment
  const renderReviewPayment = () => (
    <div className="space-y-6">
      
      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Order Review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Items Summary */}
          <div>
            <h3 className="font-semibold mb-3">Items ({cart.length})</h3>
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.size} × {item.quantity}</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium">${(item.price * item.quantity).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          {/* Customer & Fulfillment Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Customer</h4>
              <div className="space-y-1 text-muted-foreground">
                <div>{customer.name}</div>
                <div>{customer.email}</div>
                <div>{customer.phone}</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Fulfillment</h4>
              <div className="space-y-1 text-muted-foreground">
                <div>{FULFILLMENT_OPTIONS[fulfillmentType]?.label}</div>
                
                {fulfillmentType === 'pickup_market' && pickupMarket && (
                  <>
                    <div className="text-xs mt-2">
                      {PICKUP_MARKETS.find(m => m.id === pickupMarket)?.name}
                    </div>
                    <div className="text-xs">
                      Pickup Date: {pickupDate ? new Date(pickupDate).toLocaleDateString() : 'Not selected'}
                    </div>
                  </>
                )}
                
                {fulfillmentType === 'shipping' && (
                  <>
                    <div className="text-xs mt-2">{shippingAddress.street}</div>
                    <div className="text-xs">{shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}</div>
                    <div className="text-xs text-blue-600 mt-1">Est. 2-3 business days</div>
                  </>
                )}
                
                {fulfillmentType === 'delivery' && (
                  <>
                    <div className="text-xs mt-2 text-red-600">⚠️ Temporarily Unavailable</div>
                    <div className="text-xs">{deliveryAddress.street}</div>
                    <div className="text-xs">{deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.zip}</div>
                    <div className="text-xs">{deliveryTimeSlot}</div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Coupon Section */}
          {!appliedCoupon && (
            <CouponInput
              onCouponApplied={handleCouponApply}
              onCouponRemoved={handleCouponRemove}
              appliedCoupon={appliedCoupon}
              orderTotal={total}
              customerEmail={customer.email}
              disabled={isSubmitting}
            />
          )}
          
          {appliedCoupon && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-green-800">Coupon Applied: {appliedCoupon.code}</div>
                  <div className="text-sm text-green-600">{appliedCoupon.description}</div>
                </div>
                <Button onClick={handleCouponRemove} variant="ghost" size="sm" className="text-green-700">
                  Remove
                </Button>
              </div>
            </div>
          )}
          
          <Separator />
          
          {/* Price Breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            
            {couponDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Coupon Discount</span>
                <span>-${couponDiscount.toFixed(2)}</span>
              </div>
            )}
            
            {/* Show shipping/delivery fee */}
            {adjustedShippingFee > 0 && (
              <div className="flex justify-between text-sm">
                <span>
                  {fulfillmentType === 'shipping' ? 'Shipping' : 
                   fulfillmentType === 'delivery' ? 'Delivery' : 'Fulfillment'} Fee
                </span>
                <span>${adjustedShippingFee.toFixed(2)}</span>
              </div>
            )}
            
            {/* Show free shipping benefit */}
            {fulfillmentType === 'shipping' && shippingFee > 0 && adjustedShippingFee === 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Free Shipping</span>
                <span>-${shippingFee.toFixed(2)}</span>
              </div>
            )}
            
            {/* Show free delivery from coupon */}
            {(appliedCoupon?.type === 'free_delivery' || appliedCoupon?.type === 'free_shipping') && shippingFee > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Free {fulfillmentType === 'shipping' ? 'Shipping' : 'Delivery'} Savings</span>
                <span>-${shippingFee.toFixed(2)}</span>
              </div>
            )}
            
            {/* Delivery Tip */}
            {fulfillmentType === 'delivery' && deliveryTip > 0 && (
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1">
                  Driver Tip 
                  <span className="text-xs text-muted-foreground">💚</span>
                </span>
                <span>${deliveryTip.toFixed(2)}</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-[#D4AF37]">${total.toFixed(2)}</span>
            </div>
          </div>
          
          {/* Square Web Payment Form - In-Page Checkout */}
          <div className="mt-6">
            <SquareWebPaymentForm
              amountCents={Math.round(total * 100)}
              currency="USD"
              orderId={`ORDER-${Date.now()}`}
              customer={{
                name: customer.name,
                email: customer.email,
                phone: customer.phone
              }}
              lineItems={cart.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                catalogObjectId: item.catalogObjectId || item.squareVariationId
              }))}
              onPaymentSuccess={async (paymentResult) => {
                // Payment successful - save order and redirect to success page
                const orderData = {
                  id: paymentResult.orderId || `ORDER-${Date.now()}`,
                  paymentId: paymentResult.paymentId,
                  cart,
                  customer,
                  fulfillmentType,
                  fulfillmentData: fulfillmentType === 'pickup_market' ? {
                    market: pickupMarket,
                    pickupDate,
                    marketDetails: PICKUP_MARKETS.find(m => m.id === pickupMarket)
                  } : fulfillmentType === 'shipping' ? {
                    address: shippingAddress
                  } : {},
                  appliedCoupon,
                  subtotal,
                  couponDiscount,
                  shippingFee: adjustedShippingFee,
                  total,
                  status: 'paid',
                  createdAt: new Date().toISOString()
                };
                
                // Save to database
                try {
                  await fetch('/api/orders/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData)
                  });
                } catch (err) {
                  console.error('Failed to save order:', err);
                }
                
                // Clear cart and redirect
                clearCart();
                window.location.href = `/order/success?orderId=${orderData.id}&payment=success`;
              }}
              onPaymentError={(error) => {
                console.error('Payment error:', error);
                toast.error(error.message || 'Payment failed. Please try again.');
              }}
            />
          </div>
          
          <p className="text-xs text-center text-gray-600 flex items-center justify-center gap-2 mt-4">
            <Shield className="h-3 w-3 text-green-600" />
            Your payment is secured with bank-level encryption
          </p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D4AF37]/5 to-background">
      
      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="container py-4">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[1, 2, 3, 4].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors
                  ${step >= stepNum 
                    ? 'bg-[#D4AF37] text-white' 
                    : 'bg-gray-200 text-gray-500'
                  }
                `}>
                  {step > stepNum ? <CheckCircle className="h-4 w-4" /> : stepNum}
                </div>
                
                {stepNum < 4 && (
                  <div className={`
                    w-16 h-1 mx-2 transition-colors
                    ${step > stepNum ? 'bg-[#D4AF37]' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center mt-2">
            <span className="text-sm text-muted-foreground">
              Step {step} of 4: {
                step === 1 ? 'Select Products' :
                step === 2 ? 'Customer Info' :
                step === 3 ? 'Fulfillment' :
                'Review & Pay'
              }
            </span>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          
          {step === 1 && renderProductSelection()}
          {step === 2 && renderCustomerInfo()}
          {step === 3 && renderFulfillmentOptions()}
          {step === 4 && renderReviewPayment()}
          
          {/* Navigation Buttons */}
          {step < 4 && (
            <div className="flex justify-between mt-6">
              <Button 
                onClick={prevStep} 
                disabled={step === 1}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <Button 
                onClick={nextStep}
                className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#B8941F]"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {step === 4 && (
            <div className="flex justify-center mt-6">
              <Button 
                onClick={prevStep}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Fulfillment
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Spin Wheel Modal */}
      {showSpinWheel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowSpinWheel(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="p-6">
              <SpinWheel
                onWin={handleSpinWin}
                customerEmail={customer.email}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}