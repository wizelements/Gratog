'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Package, 
  Phone, 
  Search,
  ShoppingBag,
  User,
  X,
  Volume2,
  VolumeX,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  AlertCircle,
  Calendar,
  Truck,
  MapPin,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { InventoryManager } from './InventoryManager';
import { toast } from 'sonner';
import { MARKETS } from '@/lib/markets';

type OrderStatus = 
  | 'PENDING_PAYMENT' 
  | 'CONFIRMED' 
  | 'PREPARING' 
  | 'READY' 
  | 'PICKED_UP' 
  | 'CANCELLED' 
  | 'REFUNDED'
  | 'PREORDER_PENDING_PAYMENT'
  | 'PREORDER_CONFIRMED'
  | 'PREORDER_PREPARE'
  | 'PREORDER_READY'
  | 'SHIPPING_PENDING_PAYMENT'
  | 'SHIPPING_CONFIRMED'
  | 'SHIPPING_SHIPPED'
  | 'SHIPPING_DELIVERED';

type FulfillmentType = 'TODAY' | 'PREORDER' | 'SHIPPING';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items: Array<{ name: string; quantity: number }>;
  total: number;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  fulfillmentType: FulfillmentType;
  pickupDate?: string;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  queuePosition?: number | null;
  createdAt: string;
  notes?: string;
}

interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  preorderRevenue: number;
  preorderCount: number;
  shippingRevenue: number;
  shippingCount: number;
  pendingToday: number;
  readyToday: number;
  pendingPreorder: number;
  pendingShipping: number;
}

interface MarketDayDashboardProps {
  marketId?: string;
  className?: string;
}

const FULFILLMENT_TABS = [
  { id: 'TODAY', label: 'Today Pickup', icon: Clock },
  { id: 'PREORDER', label: 'Preorders', icon: Calendar },
  { id: 'SHIPPING', label: 'Shipping', icon: Truck },
] as const;

export function MarketDayDashboard({ marketId = 'serenbe-farmers-market', className }: MarketDayDashboardProps) {
  const [activeTab, setActiveTab] = useState<FulfillmentType>('TODAY');
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    todayOrders: 0,
    preorderRevenue: 0,
    preorderCount: 0,
    shippingRevenue: 0,
    shippingCount: 0,
    pendingToday: 0,
    readyToday: 0,
    pendingPreorder: 0,
    pendingShipping: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Refund dialog state
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundOrder, setRefundOrder] = useState<Order | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  // Mark paid dialog for Cash/CashApp
  const [showMarkPaidDialog, setShowMarkPaidDialog] = useState(false);
  const [markPaidOrder, setMarkPaidOrder] = useState<Order | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('/sounds/order-notification.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  // Fetch orders
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [marketId]);

  // Filter orders when tab changes
  useEffect(() => {
    const filtered = orders.filter(order => order.fulfillmentType === activeTab);
    setFilteredOrders(filtered);
  }, [activeTab, orders]);

  // Play sound on new orders
  useEffect(() => {
    const todayOrders = orders.filter(o => o.fulfillmentType === 'TODAY');
    if (todayOrders.length > lastOrderCount && soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {});
      
      if (Notification.permission === 'granted') {
        const newOrder = todayOrders[0];
        new Notification('New Order!', {
          body: `${newOrder.customerName} - $${newOrder.total}`,
          icon: '/icon-192x192.png',
        });
      }
    }
    setLastOrderCount(todayOrders.length);
  }, [orders, lastOrderCount, soundEnabled]);

  const fetchData = async () => {
    try {
      const apiKey = localStorage.getItem('admin_token');
      const response = await fetch(`/api/orders?marketId=${marketId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
        
        // Calculate stats
        const todayOrders = data.orders.filter((o: Order) => o.fulfillmentType === 'TODAY');
        const preorderOrders = data.orders.filter((o: Order) => o.fulfillmentType === 'PREORDER');
        const shippingOrders = data.orders.filter((o: Order) => o.fulfillmentType === 'SHIPPING');
        
        setStats({
          todayRevenue: todayOrders.reduce((sum: number, o: Order) => sum + (o.paymentStatus === 'PAID' ? o.total : 0), 0),
          todayOrders: todayOrders.length,
          preorderRevenue: preorderOrders.reduce((sum: number, o: Order) => sum + (o.paymentStatus === 'PAID' ? o.total : 0), 0),
          preorderCount: preorderOrders.length,
          shippingRevenue: shippingOrders.reduce((sum: number, o: Order) => sum + (o.paymentStatus === 'PAID' ? o.total : 0), 0),
          shippingCount: shippingOrders.length,
          pendingToday: todayOrders.filter((o: Order) => 
            ['PENDING_PAYMENT', 'CONFIRMED', 'PREPARING'].includes(o.status)
          ).length,
          readyToday: todayOrders.filter((o: Order) => o.status === 'READY').length,
          pendingPreorder: preorderOrders.filter((o: Order) => 
            ['PREORDER_PENDING_PAYMENT', 'PREORDER_CONFIRMED'].includes(o.status)
          ).length,
          pendingShipping: shippingOrders.filter((o: Order) => 
            ['SHIPPING_PENDING_PAYMENT', 'SHIPPING_CONFIRMED'].includes(o.status)
          ).length,
        });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const updateOrderStatus = async (orderNumber: string, status: OrderStatus) => {
    try {
      const apiKey = localStorage.getItem('admin_token');
      const response = await fetch(`/api/orders/${orderNumber}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success(`Order ${orderNumber} updated`);
        fetchData();
      } else {
        toast.error('Failed to update order');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const markOrderPaid = async (order: Order) => {
    try {
      const apiKey = localStorage.getItem('admin_token');
      const response = await fetch(`/api/orders/${order.orderNumber}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ 
          status: order.fulfillmentType === 'TODAY' ? 'CONFIRMED' : 
                  order.fulfillmentType === 'PREORDER' ? 'PREORDER_CONFIRMED' : 'SHIPPING_CONFIRMED',
          paymentStatus: 'PAID'
        }),
      });

      if (response.ok) {
        toast.success(`Payment confirmed for order ${order.orderNumber}`);
        setShowMarkPaidDialog(false);
        fetchData();
      } else {
        toast.error('Failed to confirm payment');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const openRefundDialog = (order: Order) => {
    setRefundOrder(order);
    setRefundAmount(order.total.toString());
    setRefundReason('');
    setShowRefundDialog(true);
  };

  const processRefund = async () => {
    if (!refundOrder) return;
    
    const amount = parseFloat(refundAmount);
    if (!amount || amount <= 0 || amount > refundOrder.total) {
      toast.error('Invalid refund amount');
      return;
    }
    
    if (!refundReason.trim()) {
      toast.error('Please provide a refund reason');
      return;
    }

    setIsProcessingRefund(true);
    
    try {
      const apiKey = localStorage.getItem('admin_token');
      const response = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          orderNumber: refundOrder.orderNumber,
          amount,
          reason: refundReason,
        }),
      });

      if (response.ok) {
        toast.success(`Refund processed for order ${refundOrder.orderNumber}`);
        setShowRefundDialog(false);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Refund failed');
      }
    } catch (error) {
      toast.error('Network error processing refund');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const getStatusBadge = (order: Order) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      'PENDING_PAYMENT': { label: 'Awaiting Payment', color: 'bg-amber-100 text-amber-800' },
      'CONFIRMED': { label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
      'PREPARING': { label: 'Preparing', color: 'bg-purple-100 text-purple-800' },
      'READY': { label: 'Ready', color: 'bg-emerald-100 text-emerald-800' },
      'PICKED_UP': { label: 'Picked Up', color: 'bg-gray-100 text-gray-800' },
      'PREORDER_PENDING_PAYMENT': { label: 'Awaiting Payment', color: 'bg-amber-100 text-amber-800' },
      'PREORDER_CONFIRMED': { label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
      'PREORDER_PREPARE': { label: 'Preparing', color: 'bg-purple-100 text-purple-800' },
      'PREORDER_READY': { label: 'Ready for Pickup', color: 'bg-emerald-100 text-emerald-800' },
      'SHIPPING_PENDING_PAYMENT': { label: 'Awaiting Payment', color: 'bg-amber-100 text-amber-800' },
      'SHIPPING_CONFIRMED': { label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
      'SHIPPING_SHIPPED': { label: 'Shipped', color: 'bg-cyan-100 text-cyan-800' },
      'SHIPPING_DELIVERED': { label: 'Delivered', color: 'bg-gray-100 text-gray-800' },
      'REFUNDED': { label: 'Refunded', color: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[order.status] || { label: order.status, color: 'bg-gray-100' };
    
    return (
      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", config.color)}>
        {config.label}
      </span>
    );
  };

  const renderTodayOrderCard = (order: Order) => (
    <div
      key={order.id}
      className={cn(
        "border rounded-lg p-3 transition-colors",
        order.status === 'READY' && "bg-emerald-50 border-emerald-200",
        order.status === 'PREPARING' && "bg-purple-50 border-purple-200",
        order.status === 'CONFIRMED' && "bg-blue-50 border-blue-200",
        order.status === 'PENDING_PAYMENT' && "bg-amber-50 border-amber-200"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">#{order.orderNumber}</span>
            {order.queuePosition && order.status !== 'REFUNDED' && (
              <Badge variant="outline" className="text-xs">
                #{order.queuePosition}
              </Badge>
            )}
            {getStatusBadge(order)}
          </div>
          
          <div className="flex items-center gap-1 text-sm mt-1">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium truncate">{order.customerName}</span>
          </div>
          
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Phone className="w-3 h-3" />
            <span>{order.customerPhone}</span>
          </div>

          <div className="mt-2 space-y-1">
            {order.items.map((item, idx) => (
              <div key={idx} className="text-sm flex items-center gap-1">
                <span className="font-medium">{item.quantity}x</span>
                <span className="truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-right">
          <div className={cn(
            "font-bold text-lg",
            order.status === 'REFUNDED' && "text-red-600 line-through"
          )}>
            ${order.total.toFixed(2)}
          </div>
          <div className="flex items-center gap-1 justify-end mt-1">
            {order.paymentMethod === 'CASH' && <span>💵</span>}
            {order.paymentMethod === 'CASHAPP' && <span>💸</span>}
            {order.paymentMethod === 'SQUARE_ONLINE' && <span>💳</span>}
            <span className={cn(
              "text-xs",
              order.paymentStatus === 'PAID' ? "text-emerald-600" : "text-amber-600"
            )}>
              {order.paymentStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-3 flex-wrap">
        {/* Pending Payment - Show Mark Paid */}
        {order.status === 'PENDING_PAYMENT' && (
          <>
            <Button
              size="sm"
              onClick={() => { setMarkPaidOrder(order); setShowMarkPaidDialog(true); }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Confirm Payment
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openRefundDialog(order)}
            >
              Cancel
            </Button>
          </>
        )}

        {/* Confirmed - Start Preparing */}
        {order.status === 'CONFIRMED' && (
          <Button
            size="sm"
            onClick={() => updateOrderStatus(order.orderNumber, 'PREPARING')}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Start Preparing
          </Button>
        )}

        {/* Preparing - Mark Ready */}
        {order.status === 'PREPARING' && (
          <Button
            size="sm"
            onClick={() => updateOrderStatus(order.orderNumber, 'READY')}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Mark Ready
          </Button>
        )}

        {/* Ready - Mark Picked Up */}
        {order.status === 'READY' && (
          <>
            <Button
              size="sm"
              onClick={() => updateOrderStatus(order.orderNumber, 'PICKED_UP')}
              variant="outline"
            >
              Mark Picked Up
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openRefundDialog(order)}
              className="text-red-600"
            >
              Refund
            </Button>
          </>
        )}
      </div>
    </div>
  );

  const renderPreorderOrderCard = (order: Order) => (
    <div
      key={order.id}
      className={cn(
        "border rounded-lg p-3 transition-colors",
        order.status === 'PREORDER_READY' && "bg-emerald-50 border-emerald-200",
        order.status === 'PREORDER_PREPARE' && "bg-purple-50 border-purple-200",
        order.status === 'PREORDER_CONFIRMED' && "bg-blue-50 border-blue-200",
        order.status === 'PREORDER_PENDING_PAYMENT' && "bg-amber-50 border-amber-200"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">#{order.orderNumber}</span>
            {getStatusBadge(order)}
          </div>
          
          <div className="flex items-center gap-1 text-sm mt-1">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium truncate">{order.customerName}</span>
          </div>

          {/* Pickup Date */}
          <div className="flex items-center gap-1 text-sm text-amber-600 mt-1">
            <Calendar className="w-3 h-3" />
            <span>Pickup: {order.pickupDate ? new Date(order.pickupDate).toLocaleDateString() : 'Not set'}</span>
          </div>

          <div className="mt-2 space-y-1">
            {order.items.map((item, idx) => (
              <div key={idx} className="text-sm">
                {item.quantity}x {item.name}
              </div>
            ))}
          </div>
        </div>

        <div className="text-right">
          <div className="font-bold text-lg">${order.total.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">
            {order.paymentStatus}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        {order.status === 'PREORDER_CONFIRMED' && (
          <Button
            size="sm"
            onClick={() => updateOrderStatus(order.orderNumber, 'PREORDER_PREPARE')}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Start Preparation
          </Button>
        )}
        {order.status === 'PREORDER_PREPARE' && (
          <Button
            size="sm"
            onClick={() => updateOrderStatus(order.orderNumber, 'PREORDER_READY')}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Mark Ready for Pickup
          </Button>
        )}
      </div>
    </div>
  );

  const renderShippingOrderCard = (order: Order) => (
    <div
      key={order.id}
      className={cn(
        "border rounded-lg p-3 transition-colors",
        order.status === 'SHIPPING_SHIPPED' && "bg-cyan-50 border-cyan-200",
        order.status === 'SHIPPING_CONFIRMED' && "bg-blue-50 border-blue-200",
        order.status === 'SHIPPING_PENDING_PAYMENT' && "bg-amber-50 border-amber-200"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">#{order.orderNumber}</span>
            {getStatusBadge(order)}
          </div>
          
          <div className="flex items-center gap-1 text-sm mt-1">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium truncate">{order.customerName}</span>
          </div>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <div className="flex items-start gap-1 text-sm text-muted-foreground mt-1">
              <Truck className="w-3 h-3 mt-0.5" />
              <span className="truncate">
                {order.shippingAddress.city}, {order.shippingAddress.state}
              </span>
            </div>
          )}

          <div className="mt-2 space-y-1">
            {order.items.map((item, idx) => (
              <div key={idx} className="text-sm">
                {item.quantity}x {item.name}
              </div>
            ))}
          </div>
        </div>

        <div className="text-right">
          <div className="font-bold text-lg">${order.total.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">
            {order.paymentStatus}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        {order.status === 'SHIPPING_CONFIRMED' && (
          <>
            <Button
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              <Truck className="w-4 h-4 mr-1" />
              Print Label
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateOrderStatus(order.orderNumber, 'SHIPPING_SHIPPED')}
            >
              Mark Shipped
            </Button>
          </>
        )}
        {order.status === 'SHIPPING_SHIPPED' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateOrderStatus(order.orderNumber, 'SHIPPING_DELIVERED')}
          >
            Mark Delivered
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className={cn("h-screen flex flex-col bg-background", className)}>
        {/* Header */}
        <header className="border-b bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <h1 className="font-bold text-xl">🍃 Market Dashboard</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Fulfillment Tabs */}
          <div className="mt-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FulfillmentType)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="TODAY" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="hidden sm:inline">Today</span>
                  {stats.pendingToday > 0 && (
                    <Badge variant="secondary" className="ml-1">{stats.pendingToday}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="PREORDER" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Preorders</span>
                  {stats.pendingPreorder > 0 && (
                    <Badge variant="secondary" className="ml-1">{stats.pendingPreorder}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="SHIPPING" className="flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  <span className="hidden sm:inline">Shipping</span>
                  {stats.pendingShipping > 0 && (
                    <Badge variant="secondary" className="ml-1">{stats.pendingShipping}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </header>

        {/* Stats Bar */}
        <div className="bg-muted/50 border-b px-4 py-2">
          <div className="flex gap-6 text-sm">
            {activeTab === 'TODAY' && (
              <>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold">${stats.todayRevenue.toFixed(0)}</span>
                  <span className="text-muted-foreground">rev</span>
                </div>
                <div className="flex items-center gap-1">
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold">{stats.todayOrders}</span>
                  <span className="text-muted-foreground">orders</span>
                </div>
                <div className="flex items-center gap-1">
                  <Package className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold">{stats.pendingToday}</span>
                  <span className="text-muted-foreground">pending</span>
                </div>
              </>
            )}
            {activeTab === 'PREORDER' && (
              <>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold">${stats.preorderRevenue.toFixed(0)}</span>
                  <span className="text-muted-foreground">preorder rev</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold">{stats.preorderCount}</span>
                  <span className="text-muted-foreground">preorders</span>
                </div>
              </>
            )}
            {activeTab === 'SHIPPING' && (
              <>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold">${stats.shippingRevenue.toFixed(0)}</span>
                  <span className="text-muted-foreground">shipping rev</span>
                </div>
                <div className="flex items-center gap-1">
                  <Truck className="w-4 h-4 text-cyan-600" />
                  <span className="font-semibold">{stats.shippingCount}</span>
                  <span className="text-muted-foreground">to ship</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Orders Column */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Today Pickup Orders */}
            {activeTab === 'TODAY' && (
              <>
                {filteredOrders.filter(o => 
                  ['PENDING_PAYMENT', 'CONFIRMED', 'PREPARING'].includes(o.status)
                ).length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <h2 className="font-semibold">Active ({filteredOrders.filter(o => 
                        ['PENDING_PAYMENT', 'CONFIRMED', 'PREPARING'].includes(o.status)
                      ).length})</h2>
                    </div>
                    <div className="space-y-2">
                      {filteredOrders
                        .filter(o => ['PENDING_PAYMENT', 'CONFIRMED', 'PREPARING'].includes(o.status))
                        .map(order => renderTodayOrderCard(order))}
                    </div>
                  </section>
                )}

                {filteredOrders.filter(o => o.status === 'READY').length > 0 && (
                  <section className="mt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <h2 className="font-semibold text-emerald-700">Ready for Pickup ({filteredOrders.filter(o => o.status === 'READY').length})</h2>
                    </div>
                    <div className="space-y-2">
                      {filteredOrders
                        .filter(o => o.status === 'READY')
                        .map(order => renderTodayOrderCard(order))}
                    </div>
                  </section>
                )}
              </>
            )}

            {/* Preorders */}
            {activeTab === 'PREORDER' && (
              <div className="space-y-2">
                {filteredOrders.map(order => renderPreorderOrderCard(order))}
              </div>
            )}

            {/* Shipping */}
            {activeTab === 'SHIPPING' && (
              <div className="space-y-2">
                {filteredOrders.map(order => renderShippingOrderCard(order))}
              </div>
            )}

            {filteredOrders.length === 0 && (
              <div className="text-center py-12">
                <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No {activeTab.toLowerCase()} orders</p>
              </div>
            )}
          </div>

          {/* Sidebar - Only show for Today */}
          {activeTab === 'TODAY' && (
            <div className="lg:w-80 border-t lg:border-t-0 lg:border-l bg-muted/30 p-4 space-y-4">
              <InventoryManager marketId={marketId} />
            </div>
          )}
        </div>
      </div>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Process Refund
            </DialogTitle>
            <DialogDescription>
              Order #{refundOrder?.orderNumber} - {refundOrder?.customerName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Refund Amount (Max: ${refundOrder?.total.toFixed(2)})</Label>
              <Input
                type="number"
                min="0.01"
                max={refundOrder?.total}
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>

            <div>
              <Label>Reason for Refund *</Label>
              <Textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g., Customer changed mind..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={processRefund}
              disabled={isProcessingRefund}
            >
              {isProcessingRefund ? 'Processing...' : `Refund $${parseFloat(refundAmount || 0).toFixed(2)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Paid Dialog */}
      <Dialog open={showMarkPaidDialog} onOpenChange={setShowMarkPaidDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              Mark order #{markPaidOrder?.orderNumber} as paid?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Amount: <strong>${markPaidOrder?.total.toFixed(2)}</strong>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Payment Method: <strong>{markPaidOrder?.paymentMethod}</strong>
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMarkPaidDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => markPaidOrder && markOrderPaid(markPaidOrder)}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Confirm Payment Received
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
