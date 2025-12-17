'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Sparkles, TrendingUp, Clock } from 'lucide-react';
import SpinWheel from './SpinWheel';
import { toast } from 'sonner';

export default function SpinTracker({ userEmail }) {
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSpinWheel, setShowSpinWheel] = useState(false);

  useEffect(() => {
    if (userEmail) {
      loadUserStats();
    }
  }, [userEmail]);

  const loadUserStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tracking/user?email=${encodeURIComponent(userEmail)}`);
      
      if (response.ok) {
        const data = await response.json();
        setUserStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load user stats:', error);
      toast.error('Unable to load spin data');
    } finally {
      setLoading(false);
    }
  };

  const handleSpinWin = async (prize) => {
    try {
      // Create coupon for this spin
      const couponResponse = await fetch('/api/coupons/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          discount: prize.discount || prize.value / 100,
          type: 'spin_wheel',
          description: `Spin & Win: $${prize.discount || prize.value / 100} off`
        })
      });

      if (couponResponse.ok) {
        const couponData = await couponResponse.json();
        
        // Record spin usage
        await fetch('/api/tracking/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'use_spin',
            userEmail: userEmail,
            data: {
              prize: prize.label,
              couponCode: couponData.coupon.code,
              prizeValue: prize.discount || prize.value / 100
            }
          })
        });

        toast.success(`🎉 You won ${prize.label}!`, {
          description: `Coupon code: ${couponData.coupon.code} (valid for 24 hours)`
        });
        
        // Reload stats to show updated spin count
        await loadUserStats();
        setShowSpinWheel(false);
      }
    } catch (error) {
      console.error('Spin win error:', error);
      toast.error('Failed to process your prize. Please contact support.');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  if (!userStats) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Unable to load spin data</p>
          <Button onClick={loadUserStats} className="mt-4" size="sm">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={userStats.availableSpins > 0 ? 'border-2 border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-6 h-6 text-purple-600" />
                Spin & Win Tracker
              </CardTitle>
              <CardDescription>
                Earn spins with purchases and win instant discounts
              </CardDescription>
            </div>
            {userStats.availableSpins > 0 && (
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xl px-4 py-2 animate-pulse">
                {userStats.availableSpins} {userStats.availableSpins === 1 ? 'Spin' : 'Spins'}
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Spin Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{userStats.spinsEarned || 0}</div>
              <div className="text-xs text-muted-foreground">Total Earned</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-2xl font-bold text-pink-600">{userStats.spinsUsed || 0}</div>
              <div className="text-xs text-muted-foreground">Spins Used</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-2xl font-bold text-emerald-600">{userStats.availableSpins || 0}</div>
              <div className="text-xs text-muted-foreground">Available</div>
            </div>
          </div>
          
          {/* Spin Now Button */}
          {userStats.availableSpins > 0 ? (
            <div className="text-center">
              <Button
                onClick={() => setShowSpinWheel(true)}
                size="lg"
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-lg py-6"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Use Your Spin{userStats.availableSpins > 1 ? 's' : ''} Now!
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                You can use all {userStats.availableSpins} spins or save them for later
              </p>
            </div>
          ) : (
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="text-4xl mb-2">🎰</div>
              <p className="font-medium text-gray-700 mb-2">No spins available</p>
              <p className="text-sm text-muted-foreground">
                Make a purchase to earn more spins!
              </p>
            </div>
          )}
          
          {/* How to Earn Spins */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              How to Earn Spins
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-2 bg-emerald-50 rounded">
                <span>First order $15 or more</span>
                <Badge variant="secondary">+1 Spin</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                <span>Every $20 spent (orders after first)</span>
                <Badge variant="secondary">+1 Spin</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                <span>Example: $60 order = 3 spins!</span>
                <Badge className="bg-purple-600 text-white">Stacks!</Badge>
              </div>
            </div>
          </div>
          
          {/* Recent Spin History */}
          {userStats.spinHistory && userStats.spinHistory.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-600" />
                Recent Spins
              </h4>
              <div className="space-y-2">
                {userStats.spinHistory.slice(-5).reverse().map((spin, index) => (
                  <div key={index} className="flex items-center justify-between text-xs p-2 bg-white rounded">
                    <div>
                      <span className={spin.action === 'earned' ? 'text-emerald-600' : 'text-purple-600'}>
                        {spin.action === 'earned' ? '✅ Earned' : '🎰 Used'}
                      </span>
                      {spin.prize && ` - Won: ${spin.prize}`}
                    </div>
                    <span className="text-muted-foreground">
                      {new Date(spin.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Spin Wheel Modal */}
      {showSpinWheel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowSpinWheel(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full z-10"
            >
              ✕
            </button>
            <div className="p-6">
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold mb-2">
                  Spin & Win! ({userStats.availableSpins} {userStats.availableSpins === 1 ? 'Spin' : 'Spins'} Available)
                </h2>
                <p className="text-muted-foreground">
                  Win discount codes for your next orders
                </p>
              </div>
              <SpinWheel
                onWin={handleSpinWin}
                customerEmail={userEmail}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
