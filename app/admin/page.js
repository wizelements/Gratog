'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { adminFetch } from '@/lib/admin-fetch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Package,
  RefreshCw,
  ShoppingCart,
} from 'lucide-react';

const TERMINAL_STATUSES = new Set([
  'cancelled',
  'canceled',
  'refunded',
  'delivered',
  'picked_up',
  'fulfilled',
  'completed',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
  'PICKED_UP',
]);

const PAYMENT_ATTENTION = new Set([
  'pending',
  'processing',
  'PENDING',
  'PROCESSING',
  'payment_processing',
]);

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function asDateKey(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return todayKey(date);
}

function formatDateRange(start, end) {
  if (!start && !end) return 'No date range set';
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;

  if (startDate && endDate && !Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
    const opts = { month: 'short', day: 'numeric' };
    return `${startDate.toLocaleDateString('en-US', opts)} – ${endDate.toLocaleDateString('en-US', opts)}`;
  }

  return start || end || 'No date range set';
}

function formatCurrency(value) {
  const amount = Number(value) || 0;
  const dollars = amount > 1000 ? amount / 100 : amount;
  return dollars.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function orderDisplayId(order) {
  return order.orderNumber || order.id || order._id?.slice(-8) || 'unknown';
}

function orderPickupDate(order) {
  return order.pickup?.date || order.pickupDate || order.orderTiming?.requestedDate || null;
}

function isPreorder(order) {
  const fulfillment = String(order.fulfillmentType || '').toLowerCase();
  return fulfillment.includes('preorder') || order.items?.some((item) => item.isPreorder);
}

function isOpenOrder(order) {
  return !TERMINAL_STATUSES.has(order.status);
}

function statusLabel(status) {
  if (!status) return 'Pending';
  return String(status).replace(/_/g, ' ').toLowerCase();
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [menus, setMenus] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState(null);

  const loadDashboard = useCallback(async () => {
    setRefreshing(true);

    try {
      const [ordersResult, productsResult, menusResult, marketsResult] = await Promise.allSettled([
        adminFetch('/api/admin/orders?limit=100', { skipCsrf: true }),
        adminFetch('/api/admin/products?limit=100', { skipCsrf: true }),
        adminFetch('/api/admin/menus', { skipCsrf: true }),
        adminFetch('/api/admin/markets', { skipCsrf: true }),
      ]);

      if (ordersResult.status === 'fulfilled' && ordersResult.value.success) {
        setOrders(ordersResult.value.data?.orders || []);
      }

      if (productsResult.status === 'fulfilled' && productsResult.value.success) {
        setProducts(productsResult.value.data?.products || []);
      }

      if (menusResult.status === 'fulfilled' && menusResult.value.success) {
        setMenus(menusResult.value.data?.menus || []);
      }

      if (marketsResult.status === 'fulfilled' && marketsResult.value.success) {
        setMarkets(marketsResult.value.data?.markets || []);
      }

      setLastLoadedAt(new Date());
    } catch (error) {
      logger.error('Admin', 'Failed to load operational dashboard', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const activeMenu = useMemo(
    () => menus.find((menu) => menu.isActive) || menus[0] || null,
    [menus]
  );

  const activeProducts = useMemo(
    () => products.filter((product) => product.active !== false && product.inStock !== false),
    [products]
  );

  const lowStockProducts = useMemo(
    () => products.filter((product) => product.stockStatus === 'low_stock' || product.stockStatus === 'out_of_stock'),
    [products]
  );

  const activeMarkets = useMemo(
    () => markets.filter((market) => market.isActive !== false),
    [markets]
  );

  const openOrders = useMemo(
    () => orders.filter(isOpenOrder),
    [orders]
  );

  const todaysPreorders = useMemo(() => {
    const today = todayKey();
    return orders.filter((order) => {
      if (!isPreorder(order)) return false;
      return asDateKey(orderPickupDate(order)) === today || asDateKey(order.createdAt) === today;
    });
  }, [orders]);

  const paymentAttentionOrders = useMemo(
    () => orders.filter((order) => PAYMENT_ATTENTION.has(order.paymentStatus) && isOpenOrder(order)),
    [orders]
  );

  const recentOperationalOrders = useMemo(
    () => openOrders.slice(0, 5),
    [openOrders]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-amber-700">Operations</p>
          <h1 className="text-3xl font-bold">Today at Taste of Gratitude</h1>
          <p className="text-muted-foreground">
            Active menu, market readiness, inventory pressure, and preorder fulfillment in one place.
            {lastLoadedAt && (
              <span className="ml-2 text-xs">Updated {lastLoadedAt.toLocaleTimeString()}</span>
            )}
          </p>
        </div>

        <Button onClick={loadDashboard} disabled={refreshing} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-amber-200 bg-amber-50/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-amber-900">Active Menu</CardTitle>
            <CalendarDays className="h-5 w-5 text-amber-700" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold text-amber-950">
              {activeMenu?.title || 'No active menu'}
            </div>
            <p className="mt-1 text-sm text-amber-900/75">
              {activeMenu ? formatDateRange(activeMenu.weekStart, activeMenu.weekEnd) : 'Publish this week’s menu before market day.'}
            </p>
            <Button asChild size="sm" className="mt-4 bg-amber-700 hover:bg-amber-800">
              <Link href="/admin/menus">Manage menus</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Products Ready</CardTitle>
            <Package className="h-5 w-5 text-emerald-700" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeProducts.length}</div>
            <p className="text-sm text-muted-foreground">
              {lowStockProducts.length} need inventory attention
            </p>
            <Button asChild size="sm" variant="outline" className="mt-4">
              <Link href="/admin/inventory">Review inventory</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Markets</CardTitle>
            <MapPin className="h-5 w-5 text-blue-700" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeMarkets.length}</div>
            <p className="text-sm text-muted-foreground">
              Pickup locations currently shown to customers
            </p>
            <Button asChild size="sm" variant="outline" className="mt-4">
              <Link href="/admin/markets">Manage markets</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-900">Today's Preorders</CardTitle>
            <ClipboardList className="h-5 w-5 text-emerald-700" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-950">{todaysPreorders.length}</div>
            <p className="text-sm text-emerald-900/75">
              Preorder pickups requiring fulfillment focus
            </p>
            <Button asChild size="sm" className="mt-4 bg-emerald-700 hover:bg-emerald-800">
              <Link href="/admin/orders?filter=today">Open orders</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Fulfillment Focus</CardTitle>
              <p className="text-sm text-muted-foreground">
                Open orders that still need operational attention.
              </p>
            </div>
            <Badge variant="secondary">{openOrders.length} open</Badge>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading operations…</p>
            ) : recentOperationalOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOperationalOrders.map((order) => (
                  <div key={order.id || order._id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">Order #{orderDisplayId(order)}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.customerName || 'Customer'} • {order.fulfillmentType || 'pickup'} • {order.items?.length || 0} item(s)
                      </p>
                      {orderPickupDate(order) && (
                        <p className="text-xs text-muted-foreground">
                          Pickup target: {new Date(orderPickupDate(order)).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 sm:text-right">
                      <div>
                        <p className="font-semibold">{formatCurrency(order.total)}</p>
                        <p className="text-xs capitalize text-muted-foreground">{statusLabel(order.status)}</p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link href="/admin/orders">Review</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
                <p className="font-medium">No open orders in the current admin feed.</p>
                <p className="text-sm text-muted-foreground">Keep an eye on Square sync before market pickup windows.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Action Needed</CardTitle>
            <p className="text-sm text-muted-foreground">Signals that can affect customer trust today.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg bg-yellow-50 p-3 text-yellow-950">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-700" />
              <div>
                <p className="font-medium">Inventory pressure</p>
                <p className="text-sm">{lowStockProducts.length} product(s) low or out of stock.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-3 text-blue-950">
              <ShoppingCart className="mt-0.5 h-5 w-5 text-blue-700" />
              <div>
                <p className="font-medium">Payment follow-up</p>
                <p className="text-sm">{paymentAttentionOrders.length} open order(s) still pending payment.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/orders">Orders</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/menus">Menus</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/products">Products</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/markets">Markets</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
