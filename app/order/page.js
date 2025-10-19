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
import { PRODUCTS } from '@/lib/products';

// Delivery zones configuration
const DELIVERY_ZONES = {
  zone1: { name: 'Atlanta Metro', fee: 15, timeSlots: ['9:00-11:00 AM', '11:00-1:00 PM', '1:00-3:00 PM', '3:00-5:00 PM'] },
  zone2: { name: 'Decatur/DeKalb', fee: 12, timeSlots: ['10:00-12:00 PM', '12:00-2:00 PM', '2:00-4:00 PM', '4:00-6:00 PM'] },
  zone3: { name: 'South Atlanta', fee: 18, timeSlots: ['9:00-12:00 PM', '12:00-3:00 PM', '3:00-6:00 PM'] }
};

// Fulfillment options - Only Serenbe pickup per user request
const FULFILLMENT_OPTIONS = {
  pickup_market: {
    label: 'Pick up at Serenbe Market',
    description: 'Serenbe Farmers Market - Saturdays 9:00 AM - 1:00 PM',
    fee: 0,
    icon: Package
  },
  delivery: {
    label: 'Home Delivery',
    description: 'Atlanta metro area - fee varies by location',
    fee: 'varies',
    icon: Truck
  }
};

export default function OrderPage() {
  // Core state management
  const [step, setStep] = useState(1);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '' });
  const [fulfillmentType, setFulfillmentType] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    city: '',
    state: 'GA',
    zip: ''
  });
  const [deliveryZone, setDeliveryZone] = useState('');
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [isHydrated, setIsHydrated] = useState(false);

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

  const loadSavedData = () => {
    try {
      const savedCart = localStorage.getItem('taste-of-gratitude-cart');
      const savedStep = localStorage.getItem('taste-of-gratitude-step');
      const savedCustomer = localStorage.getItem('taste-of-gratitude-customer');
      
      if (savedCart) setCart(JSON.parse(savedCart));
      if (savedStep) setStep(parseInt(savedStep));
      if (savedCustomer) setCustomer(JSON.parse(savedCustomer));
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  const saveDataToLocal = () => {
    try {
      localStorage.setItem('taste-of-gratitude-cart', JSON.stringify(cart));
      localStorage.setItem('taste-of-gratitude-step', step.toString());
      localStorage.setItem('taste-of-gratitude-customer', JSON.stringify(customer));
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
  const deliveryFee = fulfillmentType === 'delivery' ? getDeliveryFee() : 0;
  const adjustedDeliveryFee = appliedCoupon?.type === 'free_delivery' ? 0 : deliveryFee;
  const total = subtotal - couponDiscount + adjustedDeliveryFee;

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
        if (!fulfillmentType) newErrors.fulfillment = 'Please select a fulfillment option';
        
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
    if (validateStep(step)) {
      const newStep = Math.min(step + 1, 4);
      setStep(newStep);
      
      // Save step to localStorage
      try {
        localStorage.setItem('taste-of-gratitude-step', newStep.toString());
      } catch (e) {
        console.error('Failed to save step:', e);
      }
    }
  };

  const prevStep = () => {
    const newStep = Math.max(step - 1, 1);
    setStep(newStep);
    
    // Save step to localStorage
    try {
      localStorage.setItem('taste-of-gratitude-step', newStep.toString());
    } catch (e) {
      console.error('Failed to save step:', e);
    }
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
    localStorage.removeItem('taste-of-gratitude-step');
    localStorage.removeItem('taste-of-gratitude-customer');
  };

  // Enhanced checkout process - Redirect to Square Online for payment
  const handleCheckout = async () => {
    setIsSubmitting(true);
    
    try {
      // Create order record in our database
      const orderData = {
        id: `ORDER-${Date.now()}`,
        cart,
        customer,
        fulfillmentType,
        deliveryAddress: fulfillmentType === 'delivery' ? deliveryAddress : null,
        deliveryTimeSlot: fulfillmentType === 'delivery' ? deliveryTimeSlot : null,
        deliveryInstructions: fulfillmentType === 'delivery' ? deliveryInstructions : null,
        deliveryFee: adjustedDeliveryFee,
        appliedCoupon,
        subtotal,
        couponDiscount,
        total,
        source: 'website',
        status: 'pending_payment',
        squareRedirect: true,
        createdAt: new Date().toISOString()
      };
      
      // Save to database
      try {
        const response = await fetch('/api/orders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            items: cart,
            customer,
            fulfillmentType,
            deliveryAddress,
            deliveryTimeSlot,
            total,
            coupon: appliedCoupon 
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          orderData.id = data.orderId || orderData.id;
        }
      } catch (err) {
        console.warn('Failed to save order to database:', err);
        // Continue anyway - customer can still checkout on Square
      }
      
      // Store order for reference
      localStorage.setItem('pendingOrder', JSON.stringify(orderData));
      
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
                orderId: orderData.id,
                itemCount: cart.length,
                total: total
              }
            })
          });
        } catch (pointsError) {
          console.warn('Failed to award checkout points:', pointsError);
        }
      }
      
      // Build Square Online checkout URL with all cart items
      const squareCheckoutUrl = buildSquareCartUrl(cart, customer, orderData.id);
      
      // Show success message
      toast.success('Preparing your Square checkout...', {
        description: 'We\'ll show you how to complete your order on Square'
      });
      
      // Redirect to our Square checkout helper page
      setTimeout(() => {
        window.location.href = '/checkout/square';
      }, 1500);
      
    } catch (error) {
      console.error('Checkout failed:', error);
      toast.error(error.message || 'Checkout failed. Please try again.');
      setIsSubmitting(false);
    }
  };
  
  // Build Square Online cart URL with all items
  const buildSquareCartUrl = (cartItems, customerInfo, orderId) => {
    const baseUrl = 'https://tasteofgratitude.shop/s/order';
    
    if (!cartItems || cartItems.length === 0) {
      return baseUrl;
    }
    
    // Build URL with all cart items
    // Format: https://tasteofgratitude.shop/s/order?add=product1&add=product2&add=product3
    const productParams = cartItems.map(item => {
      const slug = item.slug || item.id;
      // Add quantity if more than 1
      if (item.quantity > 1) {
        return Array(item.quantity).fill(`add=${slug}`).join('&');
      }
      return `add=${slug}`;
    }).join('&');
    
    // Add customer info and order reference as URL params for tracking
    const params = new URLSearchParams();
    if (customerInfo.email) params.append('email', customerInfo.email);
    if (customerInfo.name) params.append('name', customerInfo.name);
    if (orderId) params.append('ref', orderId);
    
    const customerParams = params.toString();
    const fullUrl = `${baseUrl}?${productParams}${customerParams ? '&' + customerParams : ''}`;
    
    return fullUrl;
  };
  
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
  
  // Simple Square checkout URL generation
  const generateSquareCheckoutUrl = (order) => {
    const baseUrl = process.env.NEXT_PUBLIC_SQUARE_LINK_BASE_URL || 'https://square.link/u';
    
    if (!order.items || order.items.length === 0) {
      return `${baseUrl}/default`;
    }
    
    if (order.items.length === 1) {
      // Single product - use direct Square product link
      const item = order.items[0];
      return item.squareProductUrl || `${baseUrl}/${item.slug}`;
    } else {
      // Multiple products - redirect to first item for now
      // Future enhancement: create Square bundle or multi-item cart
      const firstItem = order.items[0];
      return firstItem.squareProductUrl || `${baseUrl}/${firstItem.slug}`;
    }
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
        
        <RadioGroup value={fulfillmentType} onValueChange={setFulfillmentType}>
          {Object.entries(FULFILLMENT_OPTIONS).map(([key, option]) => {
            const IconComponent = option.icon;
            return (
              <div key={key} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={key} id={key} className="mt-1" />
                <div className="flex-1 cursor-pointer" onClick={() => setFulfillmentType(key)}>
                  <div className="flex items-center gap-2 mb-1">
                    <IconComponent className="h-4 w-4" />
                    <Label htmlFor={key} className="font-medium cursor-pointer">{option.label}</Label>
                    {option.fee === 0 && <Badge variant="secondary">Free</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                  {typeof option.fee === 'number' && option.fee > 0 && (
                    <p className="text-sm font-medium text-[#D4AF37] mt-1">+${option.fee} delivery fee</p>
                  )}
                </div>
              </div>
            );
          })}
        </RadioGroup>
        
        {errors.fulfillment && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            {errors.fulfillment}
          </div>
        )}
        
        {/* Delivery Address Form */}
        {fulfillmentType === 'delivery' && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Delivery Address
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="street">Street Address *</Label>
              <Input
                id="street"
                value={deliveryAddress.street}
                onChange={(e) => setDeliveryAddress(prev => ({ ...prev, street: e.target.value }))}
                placeholder="123 Main Street"
                className={errors.street ? 'border-red-500' : ''}
              />
              {errors.street && <span className="text-red-500 text-xs">{errors.street}</span>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={deliveryAddress.city}
                  onChange={(e) => setDeliveryAddress(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Atlanta"
                  className={errors.city ? 'border-red-500' : ''}
                />
                {errors.city && <span className="text-red-500 text-xs">{errors.city}</span>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Select value={deliveryAddress.state} onValueChange={(value) => setDeliveryAddress(prev => ({ ...prev, state: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GA">Georgia</SelectItem>
                    <SelectItem value="AL">Alabama</SelectItem>
                    <SelectItem value="FL">Florida</SelectItem>
                    <SelectItem value="TN">Tennessee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code *</Label>
                <Input
                  id="zip"
                  value={deliveryAddress.zip}
                  onChange={(e) => setDeliveryAddress(prev => ({ ...prev, zip: e.target.value }))}
                  placeholder="30309"
                  className={errors.zip ? 'border-red-500' : ''}
                />
                {errors.zip && <span className="text-red-500 text-xs">{errors.zip}</span>}
              </div>
            </div>
            
            {/* Delivery Zone Selection */}
            <div className="space-y-2">
              <Label>Delivery Zone *</Label>
              <RadioGroup value={deliveryZone} onValueChange={setDeliveryZone}>
                {Object.entries(DELIVERY_ZONES).map(([key, zone]) => (
                  <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value={key} id={`zone-${key}`} />
                      <Label htmlFor={`zone-${key}`} className="cursor-pointer">
                        {zone.name}
                        <div className="text-xs text-muted-foreground">Delivery fee: ${zone.fee}</div>
                      </Label>
                    </div>
                  </div>
                ))}
              </RadioGroup>
              {errors.zone && <span className="text-red-500 text-xs">{errors.zone}</span>}
            </div>
            
            {/* Time Slot Selection */}
            {deliveryZone && (
              <div className="space-y-2">
                <Label>Preferred Delivery Time *</Label>
                <Select value={deliveryTimeSlot} onValueChange={setDeliveryTimeSlot}>
                  <SelectTrigger className={errors.timeSlot ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select a time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_ZONES[deliveryZone]?.timeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.timeSlot && <span className="text-red-500 text-xs">{errors.timeSlot}</span>}
              </div>
            )}
            
            {/* Delivery Instructions */}
            <div className="space-y-2">
              <Label htmlFor="instructions">Delivery Instructions (Optional)</Label>
              <Input
                id="instructions"
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
                placeholder="Apartment number, gate code, special instructions..."
              />
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
                {fulfillmentType === 'delivery' && (
                  <>
                    <div>{deliveryAddress.street}</div>
                    <div>{deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.zip}</div>
                    <div>{deliveryTimeSlot}</div>
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
            
            {adjustedDeliveryFee > 0 && (
              <div className="flex justify-between text-sm">
                <span>Delivery Fee</span>
                <span>${adjustedDeliveryFee.toFixed(2)}</span>
              </div>
            )}
            
            {appliedCoupon?.type === 'free_delivery' && deliveryFee > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Free Delivery Savings</span>
                <span>-${deliveryFee.toFixed(2)}</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-[#D4AF37]">${total.toFixed(2)}</span>
            </div>
          </div>
          
          {/* Checkout Button */}
          <Button 
            onClick={handleCheckout}
            disabled={isSubmitting || total <= 0}
            data-testid="complete-order-button"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Preparing checkout...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-5 w-5" />
                Continue to Square Checkout → ${total.toFixed(2)}
              </>
            )}
          </Button>
          
          <p className="text-xs text-center text-gray-600 flex items-center justify-center gap-2">
            <Shield className="h-3 w-3 text-green-600" />
            We'll show you how to complete your order on Square
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