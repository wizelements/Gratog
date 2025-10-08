'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Package, Truck, DollarSign, Phone, Mail } from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/admin/orders');
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'secondary',
      confirmed: 'default',
      preparing: 'default',
      ready: 'default',
      out_for_delivery: 'default',
      delivered: 'default',
      picked_up: 'default',
      cancelled: 'destructive'
    };

    const colors = {
      pending: 'bg-gray-600',
      confirmed: 'bg-blue-600',
      preparing: 'bg-yellow-600',
      ready: 'bg-orange-600',
      out_for_delivery: 'bg-blue-600',
      delivered: 'bg-green-600',
      picked_up: 'bg-green-600',
      cancelled: 'bg-red-600'
    };

    return (
      <Badge className={colors[status] || ''}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    if (filter === 'pickup') return order.fulfillmentType === 'pickup';
    if (filter === 'delivery') return order.fulfillmentType === 'delivery';
    if (filter === 'today') {
      const today = new Date().toDateString();
      return new Date(order.createdAt).toDateString() === today;
    }
    return true;
  });

  const stats = {
    total: orders.length,
    pickup: orders.filter(o => o.fulfillmentType === 'pickup').length,
    delivery: orders.filter(o => o.fulfillmentType === 'delivery').length,
    revenue: orders.reduce((sum, o) => sum + o.total, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground mt-1">
          View and manage customer orders
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
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
          <CardHeader className="pb-3">
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
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.revenue / 100).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="pickup">Pickup ({stats.pickup})</TabsTrigger>
          <TabsTrigger value="delivery">Delivery ({stats.delivery})</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          {loading ? (
            <Card>
              <CardContent className="text-center py-12">
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
            <div className="space-y-4">
              {filteredOrders.map(order => (
                <Card key={order._id} className="hover-lift">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">
                            Order #{order.orderNumber}
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
                          ${(order.total / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-semibold mb-1">Customer</p>
                        <p className="text-sm">{order.customerName}</p>
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline">
                            <Phone className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Mail className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-semibold mb-1">
                          {order.fulfillmentType === 'delivery' ? 'Delivery Address' : 'Pickup Location'}
                        </p>
                        {order.fulfillmentType === 'delivery' ? (
                          <>
                            <p className="text-sm text-muted-foreground">
                              {order.deliveryInfo.address}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Zone {order.deliveryInfo.zone} • {order.deliveryInfo.timeSlot}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {order.pickupInfo.boothNumber} • Ready {order.pickupInfo.readyTime}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-sm font-semibold mb-2">Items:</p>
                      <div className="space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{item.productName} (x{item.quantity})</span>
                            <span>${((item.priceAtPurchase * item.quantity) / 100).toFixed(2)}</span>
                          </div>
                        ))}
                        {order.deliveryFee > 0 && (
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Delivery Fee</span>
                            <span>${(order.deliveryFee / 100).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
