'use client';

import React, { useState, useEffect } from 'react';
import { User, History, Star, Phone, Mail, LogOut, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface Order {
  orderNumber: string;
  marketName: string;
  total: number;
  items: Array<{ name: string; quantity: number }>;
  createdAt: string;
  status: string;
}

interface CustomerProfile {
  phone: string;
  name?: string;
  email?: string;
  orderCount: number;
  favoriteItems: string[];
}

export default function CustomerAccountPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Check for saved login
  useEffect(() => {
    const savedPhone = localStorage.getItem('gratog_customer_phone');
    if (savedPhone) {
      setPhone(savedPhone);
      fetchProfile(savedPhone);
    }
  }, []);

  const fetchProfile = async (phoneNumber: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/customer/profile?phone=${encodeURIComponent(phoneNumber)}`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        setOrders(data.orders || []);
        setIsLoggedIn(true);
        localStorage.setItem('gratog_customer_phone', phoneNumber);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!phone || phone.length < 10) {
      return;
    }
    // In production, send SMS verification
    // For now, just fetch profile
    await fetchProfile(phone);
  };

  const handleLogout = () => {
    localStorage.removeItem('gratog_customer_phone');
    setIsLoggedIn(false);
    setProfile(null);
    setOrders([]);
  };

  const reorder = (order: Order) => {
    // Add items to cart
    localStorage.setItem('gratog_cart', JSON.stringify(
      order.items.map(item => ({
        productId: 'reorder-' + item.name,
        name: item.name,
        price: order.total / order.items.reduce((sum, i) => sum + i.quantity, 0),
        quantity: item.quantity,
      }))
    ));
    window.location.href = '/order/checkout';
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to view your orders</p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="pl-10"
                />
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Continue'}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              We'll send you a verification code via SMS
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-primary" />
            <h1 className="font-bold text-xl">My Account</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-1" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 py-8">
        <Tabs defaultValue="orders">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders">
              <History className="w-4 h-4 mr-1" /> Orders
            </TabsTrigger>
            <TabsTrigger value="favorites">
              <Star className="w-4 h-4 mr-1" /> Favorites
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold">{profile?.orderCount || 0}</div>
                <div className="text-xs text-muted-foreground">Total Orders</div>
              </Card>
            </div>

            <h2 className="font-semibold">Recent Orders</h2>
            
            {orders.length === 0 ? (
              <Card className="p-8 text-center">
                <History className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p>No orders yet</p>
                <Link href="/order/start">
                  <Button className="mt-4">Place First Order</Button>
                </Link>
              </Card>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <Card key={order.orderNumber} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">Order #{order.orderNumber}</div>
                        <div className="text-sm text-muted-foreground">{order.marketName}</div>
                        <div className="text-sm mt-1">
                          {order.items.slice(0, 2).map(i => i.name).join(', ')}
                          {order.items.length > 2 && ` +${order.items.length - 2} more`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">${order.total.toFixed(2)}</div>
                        <Badge variant="outline" className="text-xs mt-1">{order.status}</Badge>
                      </div>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2 w-full"
                      onClick={() => reorder(order)}
                    >
                      Reorder
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites">
            {profile?.favoriteItems?.length ? (
              <div className="space-y-3">
                {profile.favoriteItems.map((item, idx) => (
                  <Card key={idx} className="p-4 flex items-center justify-between">
                    <span>{item}</span>
                    <Button size="sm" variant="ghost">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Star className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p>No favorites yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your most-ordered items will appear here
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
