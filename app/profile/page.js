'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Gift,
  Flame,
  Package,
  ShoppingBag,
  TrendingUp,
  Heart,
  Sparkles,
  ChevronRight,
  Award,
  Star
} from 'lucide-react';

export default function ProfileDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalOrders: 0,
    rewardPoints: 0,
    streakDays: 0
  });
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user stats and favorites
    const fetchData = async () => {
      try {
        const [statsRes, favoritesRes] = await Promise.all([
          fetch('/api/user/stats'),
          fetch('/api/user/favorites')
        ]);

        const statsData = await statsRes.json();
        const favoritesData = await favoritesRes.json();

        if (statsData.success) {
          setStats(statsData.stats);
        }

        if (favoritesData.success) {
          setFavoriteProducts(favoritesData.favorites);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const quickActions = [
    {
      title: 'View Rewards',
      description: 'Check your points',
      icon: Gift,
      href: '/profile/rewards',
      color: 'from-emerald-400 to-teal-500'
    },
    {
      title: 'Continue Challenge',
      description: 'Build your streak',
      icon: Flame,
      href: '/profile/challenge',
      color: 'from-orange-400 to-red-500'
    },
    {
      title: 'Order History',
      description: 'View past orders',
      icon: Package,
      href: '/profile/orders',
      color: 'from-blue-400 to-indigo-500'
    },
    {
      title: 'Shop Catalog',
      description: 'Browse products',
      icon: ShoppingBag,
      href: '/catalog',
      color: 'from-purple-400 to-pink-500'
    }
  ];

  const motivationalQuotes = [
    "Gratitude is your superpower ✨",
    "Wellness begins with you 🌿",
    "Nourish your body, feed your soul 💚",
    "Every day is a fresh start 🌅"
  ];

  const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="border-emerald-200 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name?.split(' ')[0]}!</h1>
              <p className="text-emerald-100 text-lg mb-4">{randomQuote}</p>
              
              <div className="flex gap-4 flex-wrap">
                {stats.streakDays > 0 && (
                  <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                    <Flame className="h-5 w-5 text-orange-300" />
                    <span className="font-semibold">{stats.streakDays} Day Streak</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                  <Star className="h-5 w-5 text-yellow-300" />
                  <span className="font-semibold">{stats.rewardPoints} Points</span>
                </div>
              </div>
            </div>
            
            <Award className="h-16 w-16 text-emerald-200 opacity-50" />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-emerald-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Card className="border-emerald-200 hover:shadow-xl transition-all cursor-pointer group hover:scale-105">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-emerald-900">{action.title}</h3>
                          <p className="text-sm text-emerald-600">{action.description}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Favorites Section */}
      {favoriteProducts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-emerald-900">Your Favorites</h2>
            <Link href="/catalog">
              <Button variant="ghost" className="text-emerald-600 hover:text-emerald-700">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {favoriteProducts.slice(0, 3).map((product) => (
              <Card key={product.id} className="border-emerald-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-40 object-cover rounded-lg mb-3"
                  />
                  <h3 className="font-semibold text-emerald-900 mb-1">{product.name}</h3>
                  <p className="text-emerald-600 font-bold">${product.price}</p>
                  <Button className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700">
                    Add to Cart
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Challenge Progress (if user has streak) */}
      {stats.streakDays === 0 && (
        <Card className="border-emerald-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-emerald-900 flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Start Your Wellness Challenge
            </CardTitle>
            <CardDescription>
              Check in daily to build your gratitude streak and earn bonus rewards!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/profile/challenge">
              <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white">
                Start Challenge
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
