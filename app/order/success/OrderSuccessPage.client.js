'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Package, 
  Truck, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Star,
  Gift,
  Home,
  ShoppingBag,
  AlertCircle,
  Loader2,
  ExternalLink,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userPassport, setUserPassport] = useState(null);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    } else {
      setError('Order ID not provided');
      setLoading(false);
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/orders/create?id=${orderId}`);
      const result = await response.json();
      
      if (result.success && result.order) {
        setOrder(result.order);
        
        // Load user passport for rewards display
        if (result.order.customer?.email) {
          loadUserPassport(result.order.customer.email);
        }
        
        if (result.isFallback) {
          toast.info('Order retrieved from offline storage');
        }
      } else {
        throw new Error(result.error || 'Order not found');
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
      setError(error.message);
      
      // Try to load from localStorage as fallback
      tryLoadFromFallback();
    } finally {
      setLoading(false);
    }
  };

  const tryLoadFromFallback = () => {
    try {
      const fallbackOrders = JSON.parse(localStorage.getItem('taste-of-gratitude-fallback-orders') || '[]');
      const fallbackOrder = fallbackOrders.find(o => o.id === orderId);
      
      if (fallbackOrder) {
        setOrder(fallbackOrder);
        setError(null);
        toast.info('Order loaded from offline storage');
      }
    } catch (fallbackError) {
      console.error('Failed to load from fallback:', fallbackError);
    }
  };

  const loadUserPassport = async (email) => {
    try {
      const response = await fetch('/api/rewards/passport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserPassport(data.passport);
        }
      }
    } catch (error) {
      console.error('Failed to load user passport:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-green-100 text-green-800',
      delivered: 'bg-green-100 text-green-800',
      picked_up: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getFulfillmentIcon = (type) => {
    switch (type) {
      case 'delivery': return <Truck className="h-4 w-4" />;
      case 'pickup_market': return <Package className="h-4 w-4" />;
      case 'pickup_browns_mill': return <Package className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D4AF37]/5 to-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#D4AF37]" />
            <h3 className="text-lg font-semibold mb-2">Loading Order Details</h3>
            <p className="text-muted-foreground">Please wait while we fetch your order information...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2 text-red-700">Order Not Found</h3>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="flex gap-3">
              <Button
                onClick={() => router.push('/order')}
                variant="outline"
                className="flex-1"
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                New Order
              </Button>
              <Button
                onClick={() => router.push('/')}
                className="flex-1 bg-[#D4AF37] hover:bg-[#B8941F]"
              >
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-background">
      {/* Success Header */}
      <div className="bg-white border-b">
        <div className="container py-8">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-green-700 mb-2">🎉 Order Confirmed!</h1>
            <p className="text-lg text-muted-foreground mb-2">
              Thank you for your order!
            </p>
            {order?.customer && (
              <p className="text-sm text-muted-foreground">
                ✅ SMS sent to {order.customer.phone} • 📧 Email sent to {order.customer.email}
              </p>
            )}
            {order?.isFallback && (
              <Badge className="mt-3 bg-blue-100 text-blue-800">
                Offline Order - Will sync when online
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Order Summary Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order #{order?.orderNumber || order?.id}
                </CardTitle>
                <Badge className={getStatusColor(order?.status)}>
                  {order?.statusLabel || order?.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Pickup Code Card */}
              {(order?.fulfillment?.type === 'pickup_market' || order?.fulfillment?.type === 'pickup_browns_mill') && (
                <div className="space-y-4">
                  {/* Pickup Code */}
                  <div className="bg-gradient-to-r from-[#D4AF37]/20 to-[#D4AF37]/5 border-2 border-[#D4AF37] rounded-lg p-6">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-2 font-semibold">🎫 Your Pickup Code</div>
                      <div className="text-5xl font-bold text-[#D4AF37] mb-3 tracking-wider">
                        {order.orderNumber}
                      </div>
                      <div className="text-sm text-muted-foreground mb-4">
                        💡 Show this code at pickup or save this page
                      </div>
                    </div>
                  </div>
                  
                  {/* Pickup Instructions */}
                  <div className={`${order.fulfillment.type === 'pickup_browns_mill' ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300' : 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-300'} border-2 rounded-lg p-6`}>
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-2xl mb-2">{order.fulfillment.type === 'pickup_browns_mill' ? '🏘️' : '🏪'}</div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {order.fulfillment.type === 'pickup_browns_mill' ? 'DHA Dunwoody Farmers Market' : 'Serenbe Farmers Market'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {order.fulfillment.type === 'pickup_browns_mill' ? 'Brook Run Park, 4770 N Peachtree Rd, Dunwoody, GA 30338' : '10950 Hutcheson Ferry Rd, Palmetto, GA 30268'}
                        </p>
                      </div>
                      
                      <div className={`${order.fulfillment.type === 'pickup_browns_mill' ? 'bg-blue-500' : 'bg-emerald-600'} text-white rounded-lg p-4 text-center`}>
                        <div className="text-sm font-semibold mb-1">⏰ PICKUP TIME</div>
                        <div className="text-xl font-bold mb-1">This Saturday</div>
                        <div className="text-lg">
                          {order.fulfillment.type === 'pickup_browns_mill' ? '9:00 AM - 12:00 PM' : '9:00 AM - 1:00 PM'}
                        </div>
                        <div className="text-sm mt-2 bg-black/20 py-2 px-3 rounded">
                          ✨ Your order will be ready by 9:30 AM
                        </div>
                      </div>
                      
                      <div className="bg-white/50 rounded-lg p-4 space-y-3">
                        <div className="font-semibold text-gray-900 mb-2">📋 How to Pick Up:</div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <div className="bg-white rounded-full p-1 text-xs font-bold w-5 h-5 flex items-center justify-center flex-shrink-0">1</div>
                            <span className="text-gray-700">Drive to {order.fulfillment.type === 'pickup_browns_mill' ? 'Brook Run Park in Dunwoody' : 'Serenbe Farmers Market'}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="bg-white rounded-full p-1 text-xs font-bold w-5 h-5 flex items-center justify-center flex-shrink-0">2</div>
                            <span className="text-gray-700">Look for {order.fulfillment.type === 'pickup_browns_mill' ? 'the Taste of Gratitude setup at DHA Dunwoody Farmers Market' : 'the gold "Taste of Gratitude" booth (#12)'}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="bg-white rounded-full p-1 text-xs font-bold w-5 h-5 flex items-center justify-center flex-shrink-0">3</div>
                            <span className="text-gray-700">Show your pickup code: <strong>{order.orderNumber}</strong></span>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="bg-white rounded-full p-1 text-xs font-bold w-5 h-5 flex items-center justify-center flex-shrink-0">4</div>
                            <span className="text-gray-700">Grab your order and enjoy! 🌿</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-3 justify-center flex-wrap">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const mapUrl = order.fulfillment.type === 'pickup_browns_mill'
                              ? 'https://maps.google.com/?q=Brook+Run+Park+4770+N+Peachtree+Rd+Dunwoody+GA+30338'
                              : 'https://maps.google.com/?q=10950+Hutcheson+Ferry+Rd+Palmetto+GA+30268';
                            window.open(mapUrl, '_blank');
                          }}
                          className="flex-1"
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          Get Directions
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            window.open(`/api/ics/market-route?market=${order.fulfillment.type === 'pickup_browns_mill' ? 'browns_mill' : 'serenbe'}`, '_blank');
                          }}
                          className="flex-1"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Add to Calendar
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Reminder Notice */}
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">📱</div>
                      <div className="flex-1">
                        <div className="font-semibold text-yellow-900 mb-1">We'll Remind You!</div>
                        <div className="text-sm text-yellow-800">
                          We'll send you text reminders on <strong>Friday evening</strong> (order being prepared) and <strong>Saturday morning</strong> (order ready). No need to worry about forgetting!
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-3">Customer Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {order?.customer?.email}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {order?.customer?.phone}
                    </div>
                  </div>
                </div>

                {/* Fulfillment Info */}
                <div>
                  <h3 className="font-semibold mb-3">Fulfillment</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      {getFulfillmentIcon(order?.fulfillment?.type)}
                      {order?.fulfillment?.typeLabel || order?.fulfillmentType}
                    </div>
                    
                    {order?.fulfillment?.type === 'delivery' && order?.fulfillment?.deliveryAddress && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div>{order.fulfillment.deliveryAddress.street}</div>
                          <div>{order.fulfillment.deliveryAddress.city}, {order.fulfillment.deliveryAddress.state} {order.fulfillment.deliveryAddress.zip}</div>
                        </div>
                      </div>
                    )}
                    
                    {order?.fulfillment?.type === 'pickup_market' && (
                      <div className="text-muted-foreground">
                        Serenbe Farmers Market<br />
                        Saturdays 9:00 AM - 1:00 PM
                      </div>
                    )}
                    
                    {order?.fulfillment?.type === 'pickup_browns_mill' && (
                      <div className="text-muted-foreground">
                        DHA Dunwoody Farmers Market<br />
                        Saturdays 9:00 AM - 12:00 PM
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold mb-3">Items Ordered</h3>
                <div className="space-y-3">
                  {order?.items?.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.size} • Quantity: {item.quantity}
                        </div>
                        {item.rewardPoints && (
                          <Badge className="mt-1 text-xs bg-[#D4AF37]/10 text-[#D4AF37]">
                            +{item.rewardPoints * item.quantity} pts
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${(item.price * item.quantity).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div className="border-t pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${order?.pricing?.subtotal?.toFixed(2) || order?.subtotal?.toFixed(2)}</span>
                  </div>
                  
                  {order?.pricing?.couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Coupon Discount</span>
                      <span>-${order.pricing.couponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {order?.pricing?.deliveryFee > 0 && (
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span>${order.pricing.deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="border-t pt-2 flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-[#D4AF37]">${order?.pricing?.total?.toFixed(2) || order?.total?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rewards Card */}
          {userPassport && (
            <Card className="bg-gradient-to-r from-[#D4AF37]/5 to-[#D4AF37]/10 border-[#D4AF37]/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-[#D4AF37]" />
                  Your Rewards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-center p-4 bg-white/50 rounded-lg">
                      <div className="text-2xl mb-1">{userPassport.levelInfo?.emoji || '🌱'}</div>
                      <div className="font-semibold">{userPassport.levelInfo?.name || 'Explorer'}</div>
                      <div className="text-sm text-muted-foreground">Current Level</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-center p-4 bg-white/50 rounded-lg">
                      <div className="text-2xl font-bold text-[#D4AF37] mb-1">{userPassport.points || 0}</div>
                      <div className="font-semibold">Reward Points</div>
                      <div className="text-sm text-muted-foreground">Available Balance</div>
                    </div>
                  </div>
                </div>
                
                {order?.items && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700">
                      <Gift className="h-4 w-4" />
                      <span className="font-medium">
                        +{order.items.reduce((sum, item) => sum + ((item.rewardPoints || 0) * item.quantity), 0)} points earned with this order!
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                What's Next?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                  <div>
                    <div className="font-medium">Order Confirmation Sent</div>
                    <div className="text-sm text-muted-foreground">
                      We've sent confirmation details to {order?.customer?.email} and {order?.customer?.phone}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 bg-[#D4AF37] rounded-full mt-1 flex items-center justify-center">
                    <div className="h-2 w-2 bg-white rounded-full"></div>
                  </div>
                  <div>
                    <div className="font-medium">Order Processing</div>
                    <div className="text-sm text-muted-foreground">
                      We'll prepare your order and notify you when it's ready
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 border-2 border-gray-300 rounded-full mt-1"></div>
                  <div>
                    <div className="font-medium">{order?.fulfillment?.typeLabel || 'Fulfillment'}</div>
                    <div className="text-sm text-muted-foreground">
                      {order?.fulfillment?.type === 'delivery' 
                        ? 'Your order will be delivered to your address'
                        : 'Your order will be ready for pickup'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => router.push('/order')}
              variant="outline"
              className="flex-1 max-w-48"
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              Order Again
            </Button>
            <Button
              onClick={() => router.push('/')}
              className="flex-1 max-w-48 bg-[#D4AF37] hover:bg-[#B8941F]"
            >
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
