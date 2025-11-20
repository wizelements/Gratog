'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Clock, CheckCircle, Truck, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // TODO: Implement API call to fetch user orders
        // For now, showing empty state
        setOrders([]);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
      processing: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Package },
      completed: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
      shipped: { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Truck }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

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
        <h1 className="text-3xl font-bold text-emerald-900 mb-2">Order History</h1>
        <p className="text-emerald-600">View and track your past orders</p>
      </div>

      {orders.length === 0 ? (
        <Card className="border-emerald-200 shadow-lg">
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 text-emerald-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-emerald-900 mb-2">No orders yet</h3>
            <p className="text-emerald-600 mb-6">Start your wellness journey by placing your first order!</p>
            <Link href="/catalog">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Shop Now
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="border-emerald-200 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-emerald-900">Order #{order.orderNumber}</CardTitle>
                    <p className="text-sm text-emerald-600 mt-1">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Order Items */}
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-emerald-900">{item.name}</p>
                          <p className="text-sm text-emerald-600">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-semibold text-emerald-900">${item.price}</p>
                      </div>
                    ))}
                  </div>

                  {/* Fulfillment Info */}
                  {order.fulfillment && (
                    <div className="flex items-start gap-2 p-3 bg-emerald-50 rounded-lg">
                      <MapPin className="h-4 w-4 text-emerald-600 mt-0.5" />
                      <div className="text-sm text-emerald-700">
                        <p className="font-medium">{order.fulfillment.type}</p>
                        {order.fulfillment.address && (
                          <p className="text-emerald-600">{order.fulfillment.address}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Order Total & Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-emerald-100">
                    <div>
                      <p className="text-sm text-emerald-600">Total</p>
                      <p className="text-xl font-bold text-emerald-900">${order.total}</p>
                    </div>
                    <Button variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                      Reorder
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
