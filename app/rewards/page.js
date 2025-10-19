'use client';

import { useState, useEffect } from 'react';
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
  ShoppingBag
} from 'lucide-react';
import { toast } from 'sonner';
import SpinTracker from '@/components/SpinTracker';

const REWARD_LEVELS = [
  { 
    name: 'Explorer', 
    emoji: '🌱', 
    min: 0, 
    max: 99,
    benefits: ['Get started with rewards', 'Earn points on purchases', 'Birthday surprise']
  },
  { 
    name: 'Enthusiast', 
    emoji: '🌿', 
    min: 100, 
    max: 499,
    benefits: ['All Explorer benefits', '5% discount on all orders', 'Early access to new products', 'Monthly wellness tips']
  },
  { 
    name: 'Ambassador', 
    emoji: '🌟', 
    min: 500, 
    max: 999,
    benefits: ['All Enthusiast benefits', '10% discount on all orders', 'Exclusive seasonal products', 'Free shipping', 'Priority support']
  },
  { 
    name: 'Wellness Champion', 
    emoji: '👑', 
    min: 1000, 
    max: Infinity,
    benefits: ['All Ambassador benefits', '15% discount on all orders', 'VIP market access', 'Free product samples', 'Quarterly gift box', 'Influence product development']
  }
];

const POINT_ACTIVITIES = [
  { activity: 'Purchase ($1 = 1 point)', points: 'Varies', icon: ShoppingBag },
  { activity: 'Market Visit & Check-in', points: 10, icon: MapPin },
  { activity: 'Product Review', points: 15, icon: Star },
  { activity: 'Refer a Friend', points: 100, icon: Users },
  { activity: 'Social Media Share', points: 5, icon: Sparkles },
  { activity: 'Newsletter Signup', points: 20, icon: Zap }
];

export default function RewardsPage() {
  const [email, setEmail] = useState('');
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
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

  const getCurrentLevel = () => {
    if (!passport) return REWARD_LEVELS[0];
    const points = passport.points || passport.xpPoints || 0;
    return REWARD_LEVELS.find(level => points >= level.min && points <= level.max) || REWARD_LEVELS[0];
  };

  const getNextLevel = () => {
    const currentLevel = getCurrentLevel();
    const currentIndex = REWARD_LEVELS.findIndex(l => l.name === currentLevel.name);
    return REWARD_LEVELS[currentIndex + 1] || null;
  };

  const getProgressToNextLevel = () => {
    const currentLevel = getCurrentLevel();
    const nextLevel = getNextLevel();
    
    if (!nextLevel || !passport) return { progress: 100, pointsNeeded: 0 };
    
    const currentPoints = passport.points || passport.xpPoints || 0;
    const progress = ((currentPoints - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100;
    const pointsNeeded = nextLevel.min - currentPoints;
    
    return { progress, pointsNeeded };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
              <Trophy className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-emerald-800 mb-4">
            Wellness Rewards Program
          </h1>
          <p className="text-xl text-emerald-600 max-w-2xl mx-auto">
            Earn points, unlock rewards, and level up your wellness journey with every purchase and interaction
          </p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="myrewards">My Rewards</TabsTrigger>
            <TabsTrigger value="levels">Levels</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* How to Earn Points */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  How to Earn Points
                </CardTitle>
                <CardDescription>
                  Multiple ways to earn points and level up your wellness journey
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {POINT_ACTIVITIES.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-emerald-800">{item.activity}</div>
                        <div className="text-sm text-emerald-600">
                          +{item.points} {typeof item.points === 'number' ? 'points' : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
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
                    Earn points on every purchase
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

          {/* My Rewards Tab */}
          <TabsContent value="myrewards" className="space-y-6">
            {!passport ? (
              <Card>
                <CardHeader>
                  <CardTitle>Check Your Rewards</CardTitle>
                  <CardDescription>
                    Enter your email to view your points, spins, level, and available rewards
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
                      {loading ? 'Loading...' : 'View My Rewards'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Spin Tracker - New stacking system */}
                <SpinTracker userEmail={passport.email || passport.customerEmail} />
                
                {/* Current Status */}
                <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl text-white">
                          {getCurrentLevel().emoji} {getCurrentLevel().name}
                        </CardTitle>
                        <CardDescription className="text-emerald-100">
                          {passport.email || passport.customerEmail}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold">
                          {passport.points || passport.xpPoints || 0}
                        </div>
                        <div className="text-sm text-emerald-100">Total Points</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {getNextLevel() && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress to {getNextLevel().name}</span>
                          <span>{getProgressToNextLevel().pointsNeeded} points to go</span>
                        </div>
                        <Progress 
                          value={getProgressToNextLevel().progress} 
                          className="h-2 bg-emerald-700"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Current Level Benefits */}
                <Card>
                  <CardHeader>
                    <CardTitle>Your Current Benefits</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {getCurrentLevel().benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span className="text-emerald-800">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Available Vouchers */}
                {passport.vouchers && passport.vouchers.filter(v => !v.used).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-emerald-600" />
                        Available Rewards
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

          {/* Levels Tab */}
          <TabsContent value="levels" className="space-y-6">
            {REWARD_LEVELS.map((level, index) => (
              <Card key={index} className={index === 0 ? 'border-emerald-500 border-2' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-2xl">{level.emoji}</span>
                        {level.name}
                      </CardTitle>
                      <CardDescription>
                        {level.max === Infinity 
                          ? `${level.min}+ points`
                          : `${level.min} - ${level.max} points`}
                      </CardDescription>
                    </div>
                    {index === 0 && (
                      <Badge className="bg-emerald-100 text-emerald-700">
                        Starting Level
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {level.benefits.map((benefit, bIndex) => (
                      <div key={bIndex} className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                        <span className="text-gray-700">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Top Wellness Champions
                </CardTitle>
                <CardDescription>
                  Our most dedicated community members
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leaderboard.length > 0 ? (
                  <div className="space-y-3">
                    {leaderboard.map((member, index) => (
                      <div 
                        key={index} 
                        className={`flex items-center justify-between p-4 rounded-lg ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-100 to-amber-100' :
                          index === 1 ? 'bg-gradient-to-r from-gray-100 to-slate-100' :
                          index === 2 ? 'bg-gradient-to-r from-orange-100 to-amber-100' :
                          'bg-emerald-50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-2xl font-bold text-emerald-800">
                            #{index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-emerald-800">
                              {member.customerName || 'Wellness Explorer'}
                            </div>
                            <div className="text-sm text-emerald-600">
                              Level: {member.level}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-emerald-800">
                            {member.xpPoints || 0} pts
                          </div>
                          <div className="text-sm text-emerald-600">
                            {member.totalStamps || 0} stamps
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No leaderboard data available yet. Be the first!
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
