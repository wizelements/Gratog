'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingCart, Package, TrendingUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    todaySales: 0,
    todayOrders: 0,
    lowStockCount: 0,
    totalProducts: 13
  });
  const [lowStockProducts, setLowStockProducts] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/products');
      const data = await response.json();
      
      if (data.products) {
        const lowStock = data.products.filter(
          p => p.stock <= p.lowStockThreshold
        );
        setLowStockProducts(lowStock);
        setStats(prev => ({
          ...prev,
          lowStockCount: lowStock.length,
          totalProducts: data.products.length
        }));
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
        <p className="text-muted-foreground">
          Here's what's happening with your store today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Sales
            </CardTitle>
            <DollarSign className="h-5 w-5 text-[#D4AF37]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${stats.todaySales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              +0% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Orders
            </CardTitle>
            <ShoppingCart className="h-5 w-5 text-[#D4AF37]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.todayOrders}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Awaiting fulfillment
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Products
            </CardTitle>
            <Package className="h-5 w-5 text-[#D4AF37]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Active products
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift border-yellow-200 dark:border-yellow-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock Alert
            </CardTitle>
            <AlertCircle className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.lowStockCount}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Products need restocking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button asChild className="bg-[#D4AF37] hover:bg-[#B8941F]">
            <Link href="/admin/products">Manage Products</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/orders">View Orders</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/inventory">Update Inventory</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Low Stock Products */}
      {lowStockProducts.length > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Low Stock Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Current stock: {product.stock} units
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/admin/inventory">Restock</Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No recent activity to display.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
