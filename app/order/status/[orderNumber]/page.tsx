'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  CheckCircle2, 
  Clock, 
  Package, 
  AlertCircle,
  RefreshCw,
  MapPin
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface OrderStatus {
  orderNumber: string;
  customerName: string;
  status: string;
  items: Array<{ name: string; quantity: number }>;
  total: number;
  queuePosition: number | null;
  estimatedMinutes: number | null;
  estimatedReadyAt: string | null;
  pickedUpAt: string | null;
  createdAt: string;
}

const statusSteps = [
  { key: 'PENDING_PAYMENT', label: 'Payment Pending', icon: Clock },
  { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'PREPARING', label: 'Preparing', icon: Package },
  { key: 'READY', label: 'Ready', icon: CheckCircle2 },
  { key: 'PICKED_UP', label: 'Picked Up', icon: CheckCircle2 },
];

export default function OrderStatusPage() {
  const params = useParams();
  const orderNumber = params.orderNumber as string;
  
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (orderNumber) {
      fetchOrderStatus();
      const interval = setInterval(fetchOrderStatus, 10000); // Refresh every 10s
      return () => clearInterval(interval);
    }
  }, [orderNumber]);

  const fetchOrderStatus = async () => {
    try {
      const response = await fetch(`/api/orders/${orderNumber}/status`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);
        setError('');
      } else {
        setError('Order not found');
      }
    } catch (err) {
      setError('Failed to fetch order status');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIndex = (status: string) => {
    return statusSteps.findIndex(s => s.key === status);
  };

  const currentStep = order ? getStatusIndex(order.status) : -1;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 text-center max-w-sm">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h1 className="text-xl font-bold mb-2">Order Not Found</h1>
          <p className="text-muted-foreground mb-4">{error || 'Could not find this order'}</p>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-emerald-600 text-white px-4 py-6">
        <div className="max-w-md mx-auto text-center">
          <p className="text-emerald-100 mb-1">Order Status</p>
          <h1 className="text-3xl font-bold">#{order.orderNumber}</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Status Timeline */}
        <Card className="p-4">
          <h2 className="font-semibold mb-4">Order Progress</h2>          
          <div className="space-y-0">
            {statusSteps.slice(0, 4).map((step, index) => {
              const isCompleted = index <= currentStep;
              const isCurrent = index === currentStep;
              const Icon = step.icon;
              
              return (
                <div key={step.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      isCompleted && "bg-emerald-500 text-white",
                      isCurrent && !isCompleted && "bg-emerald-100 text-emerald-600 border-2 border-emerald-500",
                      !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {index < 3 && (
                      <div className={cn(
                        "w-0.5 h-8 my-1",
                        isCompleted && "bg-emerald-500",
                        !isCompleted && "bg-muted"
                      )}></div>
                    )}
                  </div>                  
                  <div className="flex-1 pb-6">
                    <div className={cn(
                      "font-medium",
                      isCurrent && "text-emerald-600",
                      !isCompleted && !isCurrent && "text-muted-foreground"
                    )}>
                      {step.label}
                    </div>                    
                    {isCurrent && order.queuePosition > 1 && (
                      <Badge variant="secondary" className="mt-1">
                        #{order.queuePosition} in queue
                      </Badge>
                    )}
                    
                    {isCurrent && order.estimatedMinutes > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        ~{order.estimatedMinutes} mins remaining
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>        
        </Card>

        {/* Order Details */}
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Order Details</h2>          
          <div className="space-y-2">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span>{item.quantity}× {item.name}</span>
              </div>
            ))}
          </div>          
          <div className="border-t mt-3 pt-3">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
          </div>
        </Card>

        {/* Pickup Info */}
        {order.status === 'READY' && (
          <Card className="p-4 bg-emerald-50 border-emerald-200">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-emerald-800">Ready for Pickup!</h3>
                <p className="text-sm text-emerald-700 mt-1">
                  Your order is ready. Come to the pickup window and give your order number: <strong>#{order.orderNumber}</strong>
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Refresh Button */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={fetchOrderStatus}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Status
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          <p>This page updates automatically</p>
          <Link href="/" className="text-primary hover:underline">
            Return to menu
          </Link>
        </div>
      </div>
    </div>
  );
}
