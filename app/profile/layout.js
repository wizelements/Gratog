'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  User,
  Package,
  Gift,
  Flame,
  Settings,
  LogOut,
  ShoppingBag,
  Trophy,
  TrendingUp,
  Heart,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export default function ProfileLayout({ children }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navItems = [
    { href: '/profile', label: 'Dashboard', icon: User },
    { href: '/profile/orders', label: 'Orders', icon: Package },
    { href: '/profile/rewards', label: 'Rewards', icon: Gift },
    { href: '/profile/challenge', label: 'Challenge', icon: Flame },
    { href: '/profile/settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="container mx-auto px-4 py-8">
        {/* Mobile Header */}
        <div className="lg:hidden mb-6">
          <Card className="border-emerald-200 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-lg font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-emerald-900">{user.name}</h2>
                  <p className="text-sm text-emerald-600">{user.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border-emerald-200 shadow-lg sticky top-4">
              <CardContent className="p-6">
                {/* Desktop Profile Header */}
                <div className="hidden lg:block mb-6 pb-6 border-b border-emerald-100">
                  <div className="flex flex-col items-center text-center">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-2xl font-bold mb-3">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <h2 className="font-bold text-emerald-900 text-lg">{user.name}</h2>
                    <p className="text-sm text-emerald-600">{user.email}</p>
                    <Badge className="mt-2 bg-emerald-100 text-emerald-700 border-emerald-200">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Wellness Member
                    </Badge>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="space-y-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.href} href={item.href}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start hover:bg-emerald-50 hover:text-emerald-700 text-emerald-900"
                        >
                          <Icon className="h-4 w-4 mr-3" />
                          {item.label}
                        </Button>
                      </Link>
                    );
                  })}

                  <Button
                    variant="ghost"
                    onClick={logout}
                    className="w-full justify-start hover:bg-red-50 hover:text-red-700 text-emerald-900"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Logout
                  </Button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
