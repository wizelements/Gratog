'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShoppingCart, Package, Truck, DollarSign, Phone, Mail, RefreshCw, ChevronDown, CheckCircle2, CloudDownload } from 'lucide-react';
import { toast } from 'sonner';

const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-600' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-600' },
  { value: 'preparing', label: 'Preparing', color: 'bg-yellow-600' },
  { value: 'ready_for_pickup', label: 'Ready for Pickup', color: 'bg-orange-600' },
  { value: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-blue-600' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-600' },
  { value: 'picked_up', label: 'Picked Up', color: 'bg-green-600' },
  { value: 'missed_pickup', label: 'Missed Pickup', color: 'bg-amber-600' },
  { value: 'rescheduled', label: 'Rescheduled', color: 'bg-purple-600' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-600' }
];

const PAYMENT_STATUSES = [
  { value: 'all_payments', label: 'All Payments', color: 'bg-gray-600' },
  { value: 'paid', label: 'Paid ✓', color: 'bg-green-600' },
  { value: 'pending', label: 'Awaiting Payment ⚠', color: 'bg-red-600' },
  { value: 'processing', label: 'Processing', color: 'bg-yellow-600' }
];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all_payments');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const fetchOrders = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const response = await fetch('/api/admin/orders');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      logger.error('Admin', 'Failed to fetch orders', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchSyncStatus();
    // Removed broken interval that wasn't calling fetchOrders
    return () => {
      // Cleanup if needed
    };
  }, [fetchOrders]);

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/admin/orders/sync', { credentials: 'include' });
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
        fetchOrders(true);
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

  const updateOrderStatus = async (orderId, newStatus) => {
    setUpdatingStatus(true);
    try {
      const response = await fetch('/api/admin/orders/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          orderId,
          status: newStatus
        })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (data.success) {
        toast.success(`Order status updated to ${newStatus.replace(/_/g, ' ')}`);
        setOrders(prev => prev.map(order => 
          order._id === orderId ? { ...order, status: newStatus } : order
        ));
        setSelectedOrder(null);
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (error) {
      logger.error('Admin', 'Failed to update order status', error);
      toast.error('Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = ORDER_STATUSES.find(s => s.value === status) || ORDER_STATUSES[0];
    return (
      <Badge className={statusConfig.color}>
        {statusConfig.label}
      </Badge>
    );
  };

  const getNextStatus = (currentStatus, fulfillmentType) => {
    const flow = fulfillmentType === 'delivery'
      ? ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered']
      : ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'picked_up'];
    
    const currentIndex = flow.indexOf(currentStatus);
    if (currentIndex >= 0 && currentIndex < flow.length - 1) {
      return flow[currentIndex + 1];
    }
    return null;
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'pickup' && order.fulfillmentType !== 'pickup') return false;
    if (filter === 'delivery' && order.fulfillmentType !== 'delivery') return false;
    if (filter === 'today') {
      const today = new Date().toDateString();
      if (new Date(order.createdAt).toDateString() !== today) return false;
    }
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    
    // Payment status filter
    if (paymentFilter === 'paid' && (order.paymentStatus !== 'COMPLETED' && order.paymentStatus !== 'APPROVED' && order.paymentStatus !== 'paid')) return false;
    if (paymentFilter === 'pending' && (order.paymentStatus === 'COMPLETED' || order.paymentStatus === 'APPROVED' || order.paymentStatus === 'paid')) return false;
    if (paymentFilter === 'processing' && order.paymentStatus !== 'PROCESSING') return false;
    
    return true;
  });

  const stats = {
    total: orders.length,
    pickup: orders.filter(o => o.fulfillmentType === 'pickup').length,
    delivery: orders.filter(o => o.fulfillmentType === 'delivery').length,
    revenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
    pending: orders.filter(o => o.status === 'pending').length,
    inProgress: orders.filter(o => ['confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery'].includes(o.status)).length,
    paid: orders.filter(o => o.paymentStatus === 'COMPLETED' || o.paymentStatus === 'APPROVED' || o.paymentStatus === 'paid').length,
    awaitingPayment: orders.filter(o => !o.paymentStatus || (o.paymentStatus !== 'COMPLETED' && o.paymentStatus !== 'APPROVED' && o.paymentStatus !== 'paid')).length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground mt-1">
            View and manage customer orders
            {lastSync && (
              <span className="ml-2 text-xs text-blue-600">
                Last Square sync: {lastSync.toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={syncFromSquare}
            disabled={syncing}
            className="bg-blue-50 hover:bg-blue-100 border-blue-200"
          >
            <CloudDownload className={`h-4 w-4 mr-2 ${syncing ? 'animate-pulse' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync from Square'}
          </Button>
          <Button
            variant="outline"
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-8 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Pickup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pickup}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Delivery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivery}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">✓ Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">⚠ Awaiting Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.awaitingPayment}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${(stats.revenue / 100).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4">
        <Tabs value={filter} onValueChange={setFilter} className="flex-1">
          <TabsList>
            <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
            <TabsTrigger value="pickup">Pickup ({stats.pickup})</TabsTrigger>
            <TabsTrigger value="delivery">Delivery ({stats.delivery})</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ORDER_STATUSES.map(status => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by payment" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_STATUSES.map(status => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="text-center py-12">
              <RefreshCw className="h-8 w-8 mx-auto text-muted-foreground animate-spin mb-4" />
              <p className="text-muted-foreground">Loading orders...</p>
            </CardContent>
          </Card>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No orders found</p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map(order => {
            const nextStatus = getNextStatus(order.status, order.fulfillmentType);
            
            return (
              <Card key={order._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          Order #{order.orderNumber || order._id?.slice(-6)}
                        </h3>
                        {getStatusBadge(order.status)}
                        {order.fulfillmentType === 'delivery' ? (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            Delivery
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            Pickup
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#D4AF37]">
                        ${((order.total || 0) / 100).toFixed(2)}
                      </p>
                      {nextStatus && order.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          className="mt-2 bg-[#059669] hover:bg-[#047857]"
                          onClick={() => updateOrderStatus(order._id, nextStatus)}
                          disabled={updatingStatus}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Mark {nextStatus.replace(/_/g, ' ')}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-semibold mb-1">Customer</p>
                      <p className="text-sm">{order.customerName || order.customer?.name || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">{order.customerEmail || order.customer?.email || ''}</p>
                      <div className="flex gap-2 mt-2">
                        {(order.customerPhone || order.customer?.phone) && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => window.open(`tel:${order.customerPhone || order.customer?.phone}`)}
                          >
                            <Phone className="h-3 w-3" />
                          </Button>
                        )}
                        {(order.customerEmail || order.customer?.email) && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => window.open(`mailto:${order.customerEmail || order.customer?.email}`)}
                          >
                            <Mail className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold mb-1">
                        {order.fulfillmentType === 'delivery' ? 'Delivery Address' : 'Pickup Location'}
                      </p>
                      {order.fulfillmentType === 'delivery' ? (
                        order.deliveryInfo ? (
                          <>
                            <p className="text-sm text-muted-foreground">
                              {order.deliveryInfo.address || 'No address provided'}
                            </p>
                            {(order.deliveryInfo.zone || order.deliveryInfo.timeSlot) && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {order.deliveryInfo.zone ? `Zone ${order.deliveryInfo.zone}` : ''}
                                {order.deliveryInfo.zone && order.deliveryInfo.timeSlot ? ' • ' : ''}
                                {order.deliveryInfo.timeSlot || ''}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">No delivery info</p>
                        )
                      ) : (
                        order.pickupInfo ? (
                          <p className="text-sm text-muted-foreground">
                            {order.pickupInfo.boothNumber ? `${order.pickupInfo.boothNumber} • ` : ''}
                            {order.pickupInfo.readyTime ? `Ready ${order.pickupInfo.readyTime}` : 'Ready for pickup'}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Standard pickup</p>
                        )
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold">Items:</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedOrder(selectedOrder?._id === order._id ? null : order)}
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${selectedOrder?._id === order._id ? 'rotate-180' : ''}`} />
                      </Button>
                    </div>
                    
                    <div className="space-y-1">
                      {(order.items || []).slice(0, selectedOrder?._id === order._id ? undefined : 3).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{item.productName || item.name} (x{item.quantity})</span>
                          <span>${(((item.priceAtPurchase || item.price || 0) * item.quantity) / 100).toFixed(2)}</span>
                        </div>
                      ))}
                      {order.items?.length > 3 && selectedOrder?._id !== order._id && (
                        <p className="text-xs text-muted-foreground">+{order.items.length - 3} more items</p>
                      )}
                      {(order.deliveryFee || 0) > 0 && (
                        <div className="flex justify-between text-sm text-muted-foreground pt-1 border-t mt-2">
                          <span>Delivery Fee</span>
                          <span>${((order.deliveryFee || 0) / 100).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedOrder?._id === order._id && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-semibold mb-2">Update Status:</p>
                      <div className="flex flex-wrap gap-2">
                        {ORDER_STATUSES.map(status => (
                          <Button
                            key={status.value}
                            size="sm"
                            variant={order.status === status.value ? 'default' : 'outline'}
                            className={order.status === status.value ? status.color : ''}
                            onClick={() => {
                              if (order.status !== status.value) {
                                updateOrderStatus(order._id, status.value);
                              }
                            }}
                            disabled={order.status === status.value || updatingStatus}
                          >
                            {status.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
