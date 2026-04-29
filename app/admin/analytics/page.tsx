'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowUp, 
  ArrowDown, 
  DollarSign, 
  ShoppingBag, 
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  revenue: number;
  orders: number;
  customers: number;
  avgOrderValue: number;
  onlineRevenue: number;
  cashRevenue: number;
  topItems: Array<{ name: string; count: number; revenue: number }>;
  hourlyData: Array<{ hour: number; orders: number; revenue: number }>;
  dailyComparison: number;
  weeklyData: Array<{ date: string; revenue: number; orders: number }>;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState('all');

  useEffect(() => {
    fetchAnalytics();
  }, [period, selectedMarket]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        period,
        marketId: selectedMarket,
      });
      const response = await fetch(`/api/analytics?${params}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportCSV = () => {
    if (!data) return;
    
    const csvContent = [
      ['Item', 'Quantity Sold', 'Revenue'].join(','),
      ...data.topItems.map(item => [item.name, item.count, item.revenue.toFixed(2)].join(',')),
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${period}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ArrowUp className="w-6 h-6 text-primary" />
            <h1 className="font-bold text-xl">Analytics Dashboard</h1>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Period Selector */}
        <div className="flex gap-4 items-center">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">This Week</TabsTrigger>
              <TabsTrigger value="month">This Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${data?.revenue?.toFixed(0) || 0}
              </div>
              {data?.dailyComparison && (
                <div className={cn(
                  "flex items-center text-xs mt-1",
                  data.dailyComparison >= 0 ? "text-emerald-600" : "text-red-600"
                )}>
                  {data.dailyComparison >= 0 ? (
                    <><ArrowUp className="w-3 h-3 mr-1" /> +{data.dailyComparison}%</>
                  ) : (
                    <><ArrowDown className="w-3 h-3 mr-1" /> {data.dailyComparison}%</>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.orders || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Order
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${data?.avgOrderValue?.toFixed(2) || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.customers || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Breakdown & Top Items */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Online (Square)</span>
                    <span className="font-medium">${data?.onlineRevenue?.toFixed(0) || 0}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ 
                        width: `${data?.revenue && data.onlineRevenue > 0 
                          ? (data.onlineRevenue / data.revenue) * 100 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Cash</span>
                    <span className="font-medium">${data?.cashRevenue?.toFixed(0) || 0}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ 
                        width: `${data?.revenue && data.cashRevenue > 0 
                          ? (data.cashRevenue / data.revenue) * 100 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Selling Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data?.topItems?.slice(0, 5).map((item, idx) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      idx === 0 ? "bg-amber-100 text-amber-700" :
                      idx === 1 ? "bg-slate-100 text-slate-700" :
                      idx === 2 ? "bg-orange-100 text-orange-700" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.count} sold
                      </div>
                    </div>
                    <div className="font-semibold">${item.revenue.toFixed(0)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
