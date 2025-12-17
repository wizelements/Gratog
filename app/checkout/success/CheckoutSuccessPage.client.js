'use client';

import { useEffect, useState, Suspense } from 'react';
import { logger } from '@/lib/logger';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Package, Star, Gift, ArrowRight, Trophy } from 'lucide-react';
import Link from 'next/link';
import SpinWheel from '@/components/SpinWheel';

function SuccessContent() {
  const searchParams = useSearchParams();
  const [orderDetails, setOrderDetails] = useState(null);
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState(false);
  const [userStats, setUserStats] = useState(null);
  const [spinsEarnedThisOrder, setSpinsEarnedThisOrder] = useState(0);
  
  const transactionId = searchParams?.get('transactionId');
  const orderId = searchParams?.get('orderId');
  const amount = searchParams?.get('amount');
  const method = searchParams?.get('method') || 'square_online';

  useEffect(() => {
    // Load order details and award spins after purchase
    const loadOrderDetails = async () => {
      const pendingOrder = localStorage.getItem('pendingOrder');
      if (pendingOrder) {
        try {
          const order = JSON.parse(pendingOrder);
          setOrderDetails(order);
          
          // Award spins based on purchase amount
          if (order.customer?.email && order.total) {
            await awardSpinsForPurchase(order);
          }
        } catch (e) {
          console.error('Failed to load order:', e);
        }
      }
    };
    
    loadOrderDetails();
  }, [amount]);
  
  const awardSpinsForPurchase = async (order) => {
    try {
      const total = order.total;
      const customerEmail = order.customer.email;
      
      // Check if user is new (first order)
      const userStatsResponse = await fetch(`/api/tracking/user?email=${encodeURIComponent(customerEmail)}`);
      const userStatsData = await userStatsResponse.json();
      const isFirstOrder = userStatsData.stats?.isNewUser || userStatsData.stats?.totalOrders === 0;
      
      let spinsEarned = 0;
      
      // Award spin logic
      if (isFirstOrder && total >= 15) {
        spinsEarned = 1; // First order $15+
      } else if (!isFirstOrder && total >= 20) {
        spinsEarned = Math.floor(total / 20); // 1 spin per $20 (stacks!)
      }
      
      if (spinsEarned > 0) {
        // Award the spins
        const response = await fetch('/api/tracking/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'earn_spin',
            userEmail: customerEmail,
            data: {
              spins: spinsEarned,
              reason: 'purchase',
              orderId: order.id,
              orderTotal: total
            }
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          debug(`✅ Awarded ${spinsEarned} spins. Total available: ${data.totalAvailableSpins}`);
          
          // Show notification about earned spins
          setTimeout(() => {
            setShowSpinWheel(true);
          }, 2000);
        }
      }
      
      // Track order completion
      await fetch('/api/tracking/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'track_order',
          userEmail: customerEmail,
          data: {
            orderId: order.id || orderId,
            total: total,
            status: 'completed',
            items: order.cart,
            fulfillmentType: order.fulfillmentType,
            customerName: order.customer.name,
            customerPhone: order.customer.phone
          }
        })
      });
      
    } catch (error) {
      console.error('Failed to award spins:', error);
    }
  };
  
  useEffect(() => {
    // Award reward points for purchase
    if (orderDetails && orderDetails.customer?.email && !pointsAwarded) {
      awardPurchasePoints();
      loadUserStats();
    }
  }, [orderDetails, pointsAwarded]);
  
  const loadUserStats = async () => {
    if (!orderDetails?.customer?.email) return;
    
    try {
      const response = await fetch(`/api/tracking/user?email=${encodeURIComponent(orderDetails.customer.email)}`);
      if (response.ok) {
        const data = await response.json();
        setUserStats(data.stats);
        setSpinsEarnedThisOrder(data.stats?.availableSpins || 0);
      }
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
  };
  
  const awardPurchasePoints = async () => {
    try {
      const total = orderDetails.total || parseFloat(amount) / 100;
      const points = Math.floor(total); // $1 = 1 point
      
      const response = await fetch('/api/rewards/add-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: orderDetails.customer.email,
          points: points,
          activityType: 'purchase',
          activityData: {
            orderId: orderId || orderDetails.id,
            transactionId: transactionId,
            total: total,
            items: orderDetails.cart?.length || 0
          }
        })
      });
      
      if (response.ok) {
        setPointsAwarded(true);
        debug(`✅ Awarded ${points} reward points for purchase`);
      }
    } catch (error) {
      console.error('Failed to award points:', error);
    }
  };
  
  const handleSpinWin = async (prize) => {
    // Record spin usage and generate coupon for next order
    try {
      // Create coupon
      const response = await fetch('/api/coupons/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: orderDetails?.customer?.email,
          discount: prize.discount || prize.value / 100,
          type: 'post_purchase_spin',
          description: `Post-purchase spin reward: $${prize.discount || prize.value / 100} off next order`
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Record spin usage
        await fetch('/api/tracking/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'use_spin',
            userEmail: orderDetails.customer.email,
            data: {
              prize: prize.label,
              couponCode: data.coupon.code,
              prizeValue: prize.discount || prize.value / 100
            }
          })
        });
        
        alert(`🎉 You won ${prize.label}! Coupon code ${data.coupon.code} created for your next order!\n\nCheck your email for the code or find it in your Rewards page.`);
      }
    } catch (error) {
      console.error('Failed to create coupon:', error);
    }
    
    setShowSpinWheel(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Success Card */}
        <Card className="mb-6 border-2 border-emerald-500">
          <CardHeader className="text-center pb-4">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-emerald-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-emerald-800">
              Order Confirmed! 🎉
            </CardTitle>
            <CardDescription className="text-lg">
              Thank you for your purchase from Taste of Gratitude
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Order Details */}
            <div className="bg-emerald-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {orderId && (
                  <div>
                    <div className="text-muted-foreground">Order ID</div>
                    <div className="font-semibold">{orderId}</div>
                  </div>
                )}
                {transactionId && (
                  <div>
                    <div className="text-muted-foreground">Transaction ID</div>
                    <div className="font-semibold text-xs">{transactionId.substring(0, 16)}...</div>
                  </div>
                )}
                {amount && (
                  <div>
                    <div className="text-muted-foreground">Amount Paid</div>
                    <div className="font-semibold text-emerald-600">
                      ${(parseFloat(amount) / 100).toFixed(2)}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-muted-foreground">Payment Method</div>
                  <div className="font-semibold capitalize">{method.replace('_', ' ')}</div>
                </div>
              </div>
            </div>
            
            {/* Order Items */}
            {orderDetails?.cart && orderDetails.cart.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  Your Items
                </h3>
                <div className="space-y-2">
                  {orderDetails.cart.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div className="flex items-center gap-3">
                        {item.image && (
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                        )}
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.size} × {item.quantity}
                          </div>
                        </div>
                      </div>
                      <div className="font-semibold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Spin Wheels Earned */}
            {spinsEarnedThisOrder > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Gift className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-purple-800">
                      You earned {spinsEarnedThisOrder} spin{spinsEarnedThisOrder > 1 ? 's' : ''}!
                    </div>
                    <div className="text-sm text-purple-700">
                      {userStats?.availableSpins > 0 
                        ? `You have ${userStats.availableSpins} total spins available`
                        : 'Spin now for a discount on your next order!'}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Reward Points Earned */}
            {pointsAwarded && orderDetails && (
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-yellow-600" />
                  <div>
                    <div className="font-semibold text-yellow-800">
                      You earned {Math.floor(orderDetails.total)} reward points!
                    </div>
                    <div className="text-sm text-yellow-700">
                      Keep shopping to level up and unlock exclusive rewards
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Fulfillment Info */}
            {orderDetails?.fulfillmentType && (
              <div>
                <h3 className="font-semibold mb-2">Fulfillment Details</h3>
                <div className="text-sm text-muted-foreground">
                  {orderDetails.fulfillmentType === 'pickup_market' && (
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      <span>Pickup at Serenbe Farmers Market - Saturdays 9AM-1PM</span>
                    </div>
                  )}
                  {orderDetails.fulfillmentType === 'delivery' && orderDetails.deliveryAddress && (
                    <div>
                      <div className="font-medium mb-1">Delivery Address:</div>
                      <div>{orderDetails.deliveryAddress.street}</div>
                      <div>
                        {orderDetails.deliveryAddress.city}, {orderDetails.deliveryAddress.state} {orderDetails.deliveryAddress.zip}
                      </div>
                      {orderDetails.deliveryTimeSlot && (
                        <div className="mt-2">Time Slot: {orderDetails.deliveryTimeSlot}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* What's Next */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">What's Next?</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Confirmation email sent to {orderDetails?.customer?.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>SMS updates will be sent to {orderDetails?.customer?.phone}</span>
                </div>
                {orderDetails?.fulfillmentType === 'pickup_market' && (
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span>Bring your order confirmation to the market booth</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/catalog" className="block">
            <Button variant="outline" className="w-full">
              Continue Shopping
            </Button>
          </Link>
          
          <Link href="/passport" className="block">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
              <Star className="mr-2 h-4 w-4" />
              View Your Passport
            </Button>
          </Link>
          
          <Link href="/rewards" className="block">
            <Button variant="outline" className="w-full border-yellow-500 text-yellow-700 hover:bg-yellow-50">
              <Trophy className="mr-2 h-4 w-4" />
              Check Rewards
            </Button>
          </Link>
        </div>
        
        {/* Spin Wheel Section - Shows if user has spins available */}
        {userStats && userStats.availableSpins > 0 && (
          <Card className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Gift className="w-12 h-12 text-purple-600" />
                <Badge className="bg-purple-600 text-white text-lg px-3 py-1">
                  {userStats.availableSpins} {userStats.availableSpins === 1 ? 'Spin' : 'Spins'} Available
                </Badge>
              </div>
              <h3 className="font-semibold text-lg mb-2">You Have Spins to Use!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Spin the wheel now to get discount codes for your next orders.
                {userStats.availableSpins > 1 && ' You can use all your spins or save them for later!'}
              </p>
              <Button
                onClick={() => setShowSpinWheel(true)}
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Gift className="mr-2 h-5 w-5" />
                Use Your Spin{userStats.availableSpins > 1 ? 's' : ''} Now
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Spins earned: {userStats.spinsEarned} | Spins used: {userStats.spinsUsed} | Available: {userStats.availableSpins}
              </p>
            </CardContent>
          </Card>
        )}
        
        {/* Old bonus spin section - removed, replaced with stacking system above */}
      </div>
      
      {/* Spin Wheel Modal */}
      {showSpinWheel && orderDetails?.customer?.email && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowSpinWheel(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full z-10"
            >
              ✕
            </button>
            <div className="p-6">
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold mb-2">Bonus Spin for Your Next Order!</h2>
                <p className="text-muted-foreground">
                  Win a discount code to use on your next purchase
                </p>
              </div>
              <SpinWheel
                onWin={handleSpinWin}
                customerEmail={orderDetails.customer.email}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
