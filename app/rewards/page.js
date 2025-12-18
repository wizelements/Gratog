'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Star, 
  Gift, 
  Zap, 
  Users, 
  Sparkles,
  ArrowRight,
  QrCode,
  MapPin,
  ShoppingBag,
  Crown,
  Gem,
  TrendingUp,
  Clock,
  CheckCircle,
  Package,
  Truck
} from 'lucide-react';
import { toast } from 'sonner';
import SpinTracker from '@/components/SpinTracker';
import ReferralWidget from '@/components/ReferralWidget';
import { useRewardsStore, TIER_THRESHOLDS, TIER_MULTIPLIERS, AVAILABLE_REWARDS } from '@/stores/rewards';

const VIP_TIERS = [
  { 
    id: 'bronze',
    name: 'Bronze', 
    emoji: '🥉', 
    icon: Trophy,
    min: 0, 
    max: 500,
    color: 'from-amber-600 to-amber-700',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-300',
    multiplier: 1,
    benefits: [
      { icon: Star, text: 'Earn 1 point per $1 spent' },
      { icon: Gift, text: 'Birthday surprise reward' },
      { icon: Sparkles, text: 'Access to member-only sales' }
    ]
  },
  { 
    id: 'silver',
    name: 'Silver', 
    emoji: '🥈', 
    icon: Star,
    min: 501, 
    max: 1500,
    color: 'from-slate-400 to-slate-500',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-300',
    multiplier: 1.25,
    benefits: [
      { icon: Star, text: 'Earn 1.25 points per $1 spent (25% bonus!)' },
      { icon: Truck, text: 'Free shipping on all orders' },
      { icon: Gift, text: 'Double birthday points' },
      { icon: Zap, text: 'Priority customer support' }
    ]
  },
  { 
    id: 'gold',
    name: 'Gold', 
    emoji: '🥇', 
    icon: Crown,
    min: 1501, 
    max: 3000,
    color: 'from-yellow-500 to-amber-500',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-300',
    multiplier: 1.5,
    benefits: [
      { icon: Star, text: 'Earn 1.5 points per $1 spent (50% bonus!)' },
      { icon: Truck, text: 'Free express shipping' },
      { icon: Clock, text: 'Early access to new products' },
      { icon: Gift, text: 'Exclusive seasonal gifts' },
      { icon: Users, text: 'VIP community access' }
    ]
  },
  { 
    id: 'platinum',
    name: 'Platinum', 
    emoji: '💎', 
    icon: Gem,
    min: 3001, 
    max: Infinity,
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-300',
    multiplier: 2,
    benefits: [
      { icon: Star, text: 'Earn 2 points per $1 spent (DOUBLE points!)' },
      { icon: Truck, text: 'Free priority shipping + gift wrapping' },
      { icon: Package, text: 'Access to exclusive products' },
      { icon: Gift, text: 'Quarterly luxury gift box' },
      { icon: Crown, text: 'Personal wellness concierge' },
      { icon: Sparkles, text: 'Influence future product development' }
    ]
  }
];

const POINT_ACTIVITIES = [
  { activity: 'Purchase ($1 = 1+ point)', points: 'Varies', icon: ShoppingBag, description: 'Earn more with higher tiers!' },
  { activity: 'Market Visit & Check-in', points: 10, icon: MapPin, description: 'Check in at farmers markets' },
  { activity: 'Product Review', points: 15, icon: Star, description: 'Share your experience' },
  { activity: 'Refer a Friend', points: 100, icon: Users, description: 'Give $5, get 100 points' },
  { activity: 'Social Media Share', points: 5, icon: Sparkles, description: 'Share on social platforms' },
  { activity: 'Newsletter Signup', points: 20, icon: Zap, description: 'One-time bonus' }
];

function AnimatedCounter({ value, duration = 1000 }) {
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef(null);
  const startValueRef = useRef(0);

  useEffect(() => {
    startValueRef.current = displayValue;
    startTimeRef.current = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(startValueRef.current + (value - startValueRef.current) * easeOutQuart);
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
}

function TierProgressBar({ currentTier, lifetimePoints }) {
  const tierOrder = ['bronze', 'silver', 'gold', 'platinum'];
  const currentIndex = tierOrder.indexOf(currentTier);
  
  if (currentIndex === tierOrder.length - 1) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-emerald-700 font-medium">🎉 Maximum tier achieved!</span>
          <span className="text-emerald-600">Platinum Member</span>
        </div>
        <Progress value={100} className="h-3 bg-emerald-100" />
      </div>
    );
  }
  
  const currentTierData = VIP_TIERS.find(t => t.id === currentTier);
  const nextTierData = VIP_TIERS[currentIndex + 1];
  
  const pointsInTier = lifetimePoints - currentTierData.min;
  const tierRange = nextTierData.min - currentTierData.min;
  const progress = Math.min(100, (pointsInTier / tierRange) * 100);
  const pointsNeeded = nextTierData.min - lifetimePoints;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">
          {currentTierData.emoji} {currentTierData.name}
        </span>
        <span className="text-muted-foreground">
          {pointsNeeded} pts to {nextTierData.emoji} {nextTierData.name}
        </span>
      </div>
      <div className="relative">
        <Progress value={progress} className="h-3" />
        <div className="absolute -top-1 right-0 transform translate-x-1/2">
          <div className="w-5 h-5 bg-white border-2 border-emerald-500 rounded-full flex items-center justify-center text-xs">
            {nextTierData.emoji}
          </div>
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{currentTierData.min} pts</span>
        <span>{nextTierData.min} pts</span>
      </div>
    </div>
  );
}

export default function RewardsPage() {
  const [email, setEmail] = useState('');
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [mounted, setMounted] = useState(false);
  
  const { 
    points, 
    tier, 
    lifetimePoints, 
    pointsHistory, 
    redeemPoints,
    getAvailableRewards,
    getTierMultiplier
  } = useRewardsStore();

  useEffect(() => {
    setMounted(true);
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const response = await fetch('/api/rewards/leaderboard');
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }
  };

  const handleLoadPassport = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/rewards/passport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        const data = await response.json();
        setPassport(data.passport);
        toast.success('Passport loaded successfully!');
      } else {
        throw new Error('Failed to load passport');
      }
    } catch (error) {
      console.error('Passport error:', error);
      toast.error('Unable to load passport. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemReward = (reward) => {
    const success = redeemPoints(reward.pointsCost, reward.name);
    if (success) {
      toast.success(`🎉 Redeemed ${reward.name}!`, {
        description: 'Your reward code will be sent to your email.'
      });
    } else {
      toast.error('Not enough points to redeem this reward');
    }
  };

  const getCurrentTierData = () => {
    return VIP_TIERS.find(t => t.id === tier) || VIP_TIERS[0];
  };

  const availableRewards = mounted ? getAvailableRewards() : [];
  const tierMultiplier = mounted ? getTierMultiplier() : 1;
  const currentTierData = getCurrentTierData();
  const TierIcon = currentTierData.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
              <Trophy className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-emerald-800 mb-4">
            VIP Loyalty Program
          </h1>
          <p className="text-xl text-emerald-600 max-w-2xl mx-auto">
            Earn points, unlock exclusive tiers, and enjoy amazing rewards with every purchase
          </p>
        </div>

        {mounted && (
          <Card className={`mb-8 border-2 ${currentTierData.borderColor} bg-gradient-to-r ${currentTierData.color} text-white overflow-hidden`}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <TierIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="text-sm text-white/80">Your Tier</div>
                    <div className="text-2xl font-bold flex items-center gap-2">
                      {currentTierData.emoji} {currentTierData.name}
                    </div>
                    <div className="text-sm text-white/80">
                      {tierMultiplier}x points multiplier
                    </div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-sm text-white/80">Available Points</div>
                  <div className="text-5xl font-bold">
                    <AnimatedCounter value={points} duration={1500} />
                  </div>
                  <div className="text-sm text-white/80">
                    Lifetime: {lifetimePoints.toLocaleString()} pts
                  </div>
                </div>
                
                <div className="flex-1 max-w-xs w-full">
                  <TierProgressBar currentTier={tier} lifetimePoints={lifetimePoints} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="rewards" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
            <TabsTrigger value="tiers">VIP Tiers</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
            <TabsTrigger value="passport">Passport</TabsTrigger>
          </TabsList>

          <TabsContent value="rewards" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-amber-500" />
                    Available Rewards
                  </CardTitle>
                  <CardDescription>
                    Redeem your points for exclusive rewards
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {AVAILABLE_REWARDS.map((reward) => {
                    const canRedeem = mounted && points >= reward.pointsCost;
                    return (
                      <div 
                        key={reward.id}
                        className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                          canRedeem 
                            ? 'border-emerald-300 bg-emerald-50 hover:border-emerald-400' 
                            : 'border-gray-200 bg-gray-50 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            canRedeem ? 'bg-emerald-200' : 'bg-gray-200'
                          }`}>
                            {reward.type === 'discount' && <span className="text-lg">💰</span>}
                            {reward.type === 'shipping' && <Truck className="w-5 h-5" />}
                            {reward.type === 'product' && <Package className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="font-medium">{reward.name}</div>
                            <div className="text-sm text-muted-foreground">{reward.description}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={canRedeem ? 'default' : 'secondary'} className="mb-2">
                            {reward.pointsCost.toLocaleString()} pts
                          </Badge>
                          <Button
                            size="sm"
                            disabled={!canRedeem}
                            onClick={() => handleRedeemReward(reward)}
                            className={canRedeem ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                          >
                            Redeem
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    How to Earn Points
                  </CardTitle>
                  <CardDescription>
                    Multiple ways to earn and level up
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {POINT_ACTIVITIES.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-amber-50 rounded-lg">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                          <item.icon className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-emerald-800">{item.activity}</div>
                          <div className="text-xs text-emerald-600">{item.description}</div>
                        </div>
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                          +{item.points} {typeof item.points === 'number' ? 'pts' : ''}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <CardHeader>
                  <CardTitle className="text-white">Get Your Passport</CardTitle>
                  <CardDescription className="text-emerald-100">
                    Digital passport for market check-ins
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => window.location.href = '/passport'}
                    className="w-full bg-white text-emerald-600 hover:bg-emerald-50"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Get Passport
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                <CardHeader>
                  <CardTitle className="text-white">Shop & Earn</CardTitle>
                  <CardDescription className="text-amber-100">
                    Earn {tierMultiplier}x points on every purchase
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => window.location.href = '/catalog'}
                    className="w-full bg-white text-amber-600 hover:bg-amber-50"
                  >
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Shop Now
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                <CardHeader>
                  <CardTitle className="text-white">Visit Markets</CardTitle>
                  <CardDescription className="text-purple-100">
                    Find us at local farmers markets
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => window.location.href = '/markets'}
                    className="w-full bg-white text-purple-600 hover:bg-purple-50"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    View Markets
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tiers" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {VIP_TIERS.map((tierData, index) => {
                const isCurrentTier = mounted && tierData.id === tier;
                const TierIconComponent = tierData.icon;
                
                return (
                  <Card 
                    key={tierData.id} 
                    className={`relative overflow-hidden transition-all ${
                      isCurrentTier 
                        ? `border-2 ${tierData.borderColor} ring-2 ring-offset-2 ring-${tierData.id === 'platinum' ? 'emerald' : tierData.id === 'gold' ? 'yellow' : tierData.id === 'silver' ? 'slate' : 'amber'}-400`
                        : ''
                    }`}
                  >
                    {isCurrentTier && (
                      <div className="absolute top-3 right-3">
                        <Badge className={`bg-gradient-to-r ${tierData.color} text-white`}>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Current
                        </Badge>
                      </div>
                    )}
                    <CardHeader className={`${tierData.bgColor}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 bg-gradient-to-br ${tierData.color} rounded-full flex items-center justify-center`}>
                          <TierIconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className={`flex items-center gap-2 ${tierData.textColor}`}>
                            <span className="text-2xl">{tierData.emoji}</span>
                            {tierData.name}
                          </CardTitle>
                          <CardDescription>
                            {tierData.max === Infinity 
                              ? `${tierData.min.toLocaleString()}+ lifetime points`
                              : `${tierData.min.toLocaleString()} - ${tierData.max.toLocaleString()} lifetime points`}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="mb-4">
                        <Badge className={`${tierData.bgColor} ${tierData.textColor} border ${tierData.borderColor}`}>
                          {tierData.multiplier}x Points Multiplier
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {tierData.benefits.map((benefit, bIndex) => (
                          <div key={bIndex} className="flex items-center gap-2">
                            <benefit.icon className={`w-4 h-4 ${tierData.textColor} flex-shrink-0`} />
                            <span className="text-sm text-gray-700">{benefit.text}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  Points History
                </CardTitle>
                <CardDescription>
                  Your recent points activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {mounted && pointsHistory.length > 0 ? (
                  <div className="space-y-3">
                    {pointsHistory.map((entry) => (
                      <div 
                        key={entry.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            entry.amount > 0 ? 'bg-emerald-100' : 'bg-amber-100'
                          }`}>
                            {entry.type === 'earned' && <TrendingUp className="w-5 h-5 text-emerald-600" />}
                            {entry.type === 'redeemed' && <Gift className="w-5 h-5 text-amber-600" />}
                            {entry.type === 'referral' && <Users className="w-5 h-5 text-purple-600" />}
                            {entry.type === 'bonus' && <Sparkles className="w-5 h-5 text-pink-600" />}
                          </div>
                          <div>
                            <div className="font-medium">{entry.description}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(entry.timestamp).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                        <Badge 
                          variant={entry.amount > 0 ? 'default' : 'secondary'}
                          className={entry.amount > 0 ? 'bg-emerald-600' : 'bg-amber-600 text-white'}
                        >
                          {entry.amount > 0 ? '+' : ''}{entry.amount.toLocaleString()} pts
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-muted-foreground">No points history yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Start earning points by making a purchase!
                    </p>
                    <Button 
                      className="mt-4"
                      onClick={() => window.location.href = '/catalog'}
                    >
                      Shop Now
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals" className="space-y-6">
            <ReferralWidget />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Referral Program Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-emerald-50 rounded-lg">
                    <div className="text-4xl mb-2">1️⃣</div>
                    <h3 className="font-bold text-emerald-800 mb-2">Share Your Code</h3>
                    <p className="text-sm text-emerald-600">
                      Share your unique referral code with friends and family
                    </p>
                  </div>
                  <div className="text-center p-6 bg-amber-50 rounded-lg">
                    <div className="text-4xl mb-2">2️⃣</div>
                    <h3 className="font-bold text-amber-800 mb-2">They Save $5</h3>
                    <p className="text-sm text-amber-600">
                      Your friend gets $5 off their first order
                    </p>
                  </div>
                  <div className="text-center p-6 bg-purple-50 rounded-lg">
                    <div className="text-4xl mb-2">3️⃣</div>
                    <h3 className="font-bold text-purple-800 mb-2">You Earn 100 pts</h3>
                    <p className="text-sm text-purple-600">
                      Earn 100 bonus points when they complete their purchase
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="passport" className="space-y-6">
            {!passport ? (
              <Card>
                <CardHeader>
                  <CardTitle>Check Your Wellness Passport</CardTitle>
                  <CardDescription>
                    Enter your email to view your passport, spins, and market check-ins
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLoadPassport} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? 'Loading...' : 'View My Passport'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <SpinTracker userEmail={passport.email || passport.customerEmail} />
                
                <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl text-white">
                          Wellness Passport
                        </CardTitle>
                        <CardDescription className="text-emerald-100">
                          {passport.email || passport.customerEmail}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold">
                          {passport.points || passport.xpPoints || 0}
                        </div>
                        <div className="text-sm text-emerald-100">Passport Points</div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {passport.vouchers && passport.vouchers.filter(v => !v.used).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-emerald-600" />
                        Available Vouchers
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {passport.vouchers
                          .filter(v => !v.used)
                          .map((voucher, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                              <div>
                                <div className="font-medium text-emerald-800">
                                  {voucher.title || voucher.type}
                                </div>
                                <div className="text-sm text-emerald-600">
                                  Code: {voucher.code}
                                </div>
                              </div>
                              <Badge className="bg-emerald-100 text-emerald-700">
                                Active
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button 
                  onClick={() => setPassport(null)}
                  variant="outline"
                  className="w-full"
                >
                  Check Different Account
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
