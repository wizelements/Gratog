'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Gift, Star, TrendingUp, Award, Sparkles } from 'lucide-react';

export default function RewardsPage() {
  const [rewards, setRewards] = useState({
    points: 0,
    lifetimePoints: 0,
    history: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRewards = async () => {
      try {
        // TODO: Implement API call to fetch user rewards
        setRewards({
          points: 0,
          lifetimePoints: 0,
          history: []
        });
      } catch (error) {
        console.error('Failed to fetch rewards:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRewards();
  }, []);

  const rewardTiers = [
    {
      name: 'Free 2oz Shot',
      points: 100,
      description: 'Redeem for a complimentary 2oz wellness shot',
      icon: Gift,
      color: 'from-emerald-400 to-teal-500'
    },
    {
      name: '$5 Off Gel',
      points: 200,
      description: 'Save $5 on any sea moss gel',
      icon: Star,
      color: 'from-blue-400 to-indigo-500'
    },
    {
      name: 'Free Lemonade',
      points: 300,
      description: 'Get a free sea moss lemonade',
      icon: Award,
      color: 'from-purple-400 to-pink-500'
    },
    {
      name: 'Double Points Day',
      points: 500,
      description: 'Earn 2x points on your next order',
      icon: TrendingUp,
      color: 'from-orange-400 to-red-500'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-emerald-900 mb-2">Rewards Center</h1>
        <p className="text-emerald-600">Earn points and unlock exclusive rewards</p>
      </div>

      {/* Points Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-emerald-200 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 mb-1">Current Points</p>
                <p className="text-4xl font-bold">{rewards.points}</p>
              </div>
              <Star className="h-12 w-12 text-emerald-200 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-600 mb-1">Lifetime Points</p>
                <p className="text-4xl font-bold text-emerald-900">{rewards.lifetimePoints}</p>
              </div>
              <Award className="h-12 w-12 text-emerald-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Redeemable Rewards */}
      <div>
        <h2 className="text-2xl font-bold text-emerald-900 mb-4">Redeemable Rewards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rewardTiers.map((tier) => {
            const Icon = tier.icon;
            const canRedeem = rewards.points >= tier.points;

            return (
              <Card key={tier.name} className={`border-emerald-200 ${
                canRedeem ? 'shadow-lg' : 'opacity-60'
              }`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <Badge className={canRedeem ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}>
                      {tier.points} points
                    </Badge>
                  </div>
                  <CardTitle className="text-emerald-900 mt-3">{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    disabled={!canRedeem}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                  >
                    {canRedeem ? 'Redeem Now' : `Need ${tier.points - rewards.points} more points`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* How to Earn Points */}
      <Card className="border-emerald-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-emerald-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            How to Earn Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
              <span className="text-emerald-900">Place an order</span>
              <Badge className="bg-emerald-600 text-white">10 points per $1</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
              <span className="text-emerald-900">Daily check-in</span>
              <Badge className="bg-emerald-600 text-white">5 points</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
              <span className="text-emerald-900">Complete 7-day streak</span>
              <Badge className="bg-emerald-600 text-white">50 bonus points</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity History */}
      {rewards.history.length > 0 && (
        <Card className="border-emerald-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-emerald-900">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rewards.history.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 border-b border-emerald-100 last:border-0">
                  <div>
                    <p className="font-medium text-emerald-900">{activity.description}</p>
                    <p className="text-sm text-emerald-600">
                      {new Date(activity.date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700">
                    +{activity.points} pts
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
