'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingCart, Package, TrendingUp, AlertCircle, CloudDownload, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    todaySales: 0,
    todayOrders: 0,
    totalOrders: 0,
    totalRevenue: 0,
    lowStockCount: 0,
    totalProducts: 13
  });
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    fetchOrders();
    fetchSyncStatus();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/products');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
      logger.error('Admin', 'Failed to fetch dashboard data', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/admin/orders');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      if (data.orders) {
        const orders = data.orders;
        const today = new Date().toDateString();
        const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
        const todaySales = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        
        setStats(prev => ({
          ...prev,
          todayOrders: todayOrders.length,
          todaySales: todaySales / 100,
          totalOrders: orders.length,
          totalRevenue: totalRevenue / 100
        }));
        
        setRecentOrders(orders.slice(0, 5));
      }
    } catch (error) {
      logger.error('Admin', 'Failed to fetch orders', error);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/admin/orders/sync');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.lastSync) {
        setLastSync(new Date(data.lastSync));
      }
    } catch (error) {
      logger.debug('Admin', 'Could not fetch sync status');
    }
  };

  const syncFromSquare = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/admin/orders/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({})
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Synced ${data.synced} orders from Square`);
        setLastSync(new Date());
        fetchOrders();
      } else {
        toast.error(data.error || 'Failed to sync orders');
      }
    } catch (error) {
      logger.error('Admin', 'Failed to sync from Square', error);
      toast.error('Failed to sync orders from Square');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
          <p className="text-muted-foreground">
            Here's what's happening with your store today.
            {lastSync && (
              <span className="ml-2 text-xs text-blue-600">
                Last Square sync: {lastSync.toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={syncFromSquare}
          disabled={syncing}
          className="bg-blue-50 hover:bg-blue-100 border-blue-200"
        >
          <CloudDownload className={`h-4 w-4 mr-2 ${syncing ? 'animate-pulse' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync from Square'}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Sales
            </CardTitle>
            <DollarSign className="h-5 w-5 text-[#D4AF37]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${stats.todaySales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.todayOrders} orders today
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All time
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
            <ShoppingCart className="h-5 w-5 text-[#D4AF37]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From Square
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Orders
            </CardTitle>
            <ShoppingCart className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.todayOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
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
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">
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
            <div className="text-2xl font-bold text-yellow-600">{stats.lowStockCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Need restocking
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
          <Button asChild variant="outline" className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white">
            <Link href="/admin/coupons">🎡 Manage Coupons</Link>
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

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders from Square</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/orders">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentOrders.length > 0 ? (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order._id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      Order #{order.orderNumber || order._id?.slice(-6)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {order.customerName || 'Customer'} • {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.items?.length || 0} items • {order.fulfillmentType === 'delivery' ? '🚚 Delivery' : '📦 Pickup'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#D4AF37]">
                      ${((order.total || 0) / 100).toFixed(2)}
                    </p>
                    <p className={`text-xs font-medium ${
                      order.status === 'delivered' || order.status === 'picked_up' ? 'text-green-600' :
                      order.status === 'cancelled' ? 'text-red-600' :
                      'text-blue-600'
                    }`}>
                      {order.status?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                No orders synced yet. Click "Sync from Square" to import your orders.
              </p>
              <Button
                onClick={syncFromSquare}
                disabled={syncing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CloudDownload className="h-4 w-4 mr-2" />
                Sync Orders Now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
