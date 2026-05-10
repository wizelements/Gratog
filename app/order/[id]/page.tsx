/**
 * 🚀 Gratog Order Confirmation Page
 * Server component fetching order from MongoDB
 * Receipt view with print styling
 * Link to queue status page
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { connectToDatabase } from '@/lib/db-optimized';
import { ObjectId } from 'mongodb';
import { 
  CheckCircle2, 
  Clock, 
  Package, 
  MapPin,
  Printer,
  ArrowRight,
  Receipt,
  Utensils
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  priceCents: number;
  upsellIds?: string[];
}

interface Order {
  _id: string;
  orderNumber: string;
  orderRef?: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'cancelled';
  items: OrderItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  marketId?: string;
  marketName?: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt?: string;
  estimatedReadyAt?: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusConfig = {
  pending: { 
    label: 'Pending Payment', 
    color: 'bg-amber-500',
    textColor: 'text-amber-600',
    borderColor: 'border-amber-200',
    icon: Clock,
    description: 'Waiting for payment confirmation'
  },
  confirmed: { 
    label: 'Confirmed', 
    color: 'bg-emerald-500',
    textColor: 'text-emerald-600',
    borderColor: 'border-emerald-200',
    icon: CheckCircle2,
    description: 'Order received and confirmed'
  },
  preparing: { 
    label: 'Preparing', 
    color: 'bg-blue-500',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    icon: Utensils,
    description: 'Your order is being prepared'
  },
  ready: { 
    label: 'Ready for Pickup', 
    color: 'bg-green-500',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
    icon: Package,
    description: 'Your order is ready!'
  },
  picked_up: { 
    label: 'Picked Up', 
    color: 'bg-gray-500',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-200',
    icon: CheckCircle2,
    description: 'Enjoy your order!'
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'bg-red-500',
    textColor: 'text-red-600',
    borderColor: 'border-red-200',
    icon: Clock,
    description: 'Order has been cancelled'
  }
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

async function getOrder(id: string): Promise<Order | null> {
  try {
    const { db } = await connectToDatabase();
    
    // Try to find by orderNumber first, then by _id
    let order = await db.collection('orders').findOne(
      { orderNumber: id },
      { projection: { _id: 1, orderNumber: 1, orderRef: 1, status: 1, items: 1, 
        subtotalCents: 1, taxCents: 1, totalCents: 1, customerName: 1, 
        customerEmail: 1, customerPhone: 1, marketId: 1, marketName: 1,
        paymentMethod: 1, createdAt: 1, updatedAt: 1, estimatedReadyAt: 1 } }
    );
    
    // If not found by orderNumber, try _id
    if (!order && ObjectId.isValid(id)) {
      order = await db.collection('orders').findOne(
        { _id: new ObjectId(id) },
        { projection: { _id: 1, orderNumber: 1, orderRef: 1, status: 1, items: 1, 
          subtotalCents: 1, taxCents: 1, totalCents: 1, customerName: 1, 
          customerEmail: 1, customerPhone: 1, marketId: 1, marketName: 1,
          paymentMethod: 1, createdAt: 1, updatedAt: 1, estimatedReadyAt: 1 } }
      );
    }
    
    if (!order) return null;
    
    return {
      _id: order._id.toString(),
      orderNumber: order.orderNumber || order.orderRef || order._id.toString(),
      orderRef: order.orderRef,
      status: order.status || 'pending',
      items: order.items || [],
      subtotalCents: order.subtotalCents || 0,
      taxCents: order.taxCents || 0,
      totalCents: order.totalCents || 0,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      marketId: order.marketId,
      marketName: order.marketName,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt?.toISOString?.() || order.createdAt || new Date().toISOString(),
      updatedAt: order.updatedAt?.toISOString?.() || order.updatedAt,
      estimatedReadyAt: order.estimatedReadyAt?.toISOString?.() || order.estimatedReadyAt
    };
  } catch (error) {
    console.error('Failed to fetch order:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Order #${id} | Gratog`,
    description: 'View your order details and receipt',
  };
}

export default async function OrderPage({ params }: PageProps) {
  const { id } = await params;
  const order = await getOrder(id);
  
  if (!order) {
    notFound();
  }
  
  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const displayOrderId = order.orderRef || order.orderNumber;
  
  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* Header - Hidden in print */}
      <header className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-6 print:hidden">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-emerald-100 text-sm font-medium">Order Confirmed</span>
          </div>
          <h1 className="text-2xl font-bold">Order #{displayOrderId}</h1>
        </div>
      </header>
      
      {/* Print Header - Only visible in print */}
      <div className="hidden print:block text-center py-6 border-b-2 border-black">
        <h1 className="text-2xl font-bold">Gratog Receipt</h1>
        <p className="text-sm text-gray-600">tasteofgratitude.shop</p>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4 print:max-w-none print:p-0">
        {/* Status Card */}
        <Card className={cn(
          "border-2 print:border-gray-300",
          status.borderColor
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center print:bg-gray-200",
                status.color
              )}>
                <StatusIcon className="w-7 h-7 text-white print:text-gray-700" />
              </div>
              <div className="flex-1">
                <h2 className={cn("text-lg font-bold", status.textColor)}>
                  {status.label}
                </h2>
                <p className="text-sm text-gray-600">{status.description}</p>
              </div>
            </div>
            
            {/* Queue Status Link - Hidden in print */}
            {(order.status === 'confirmed' || order.status === 'preparing') && (
              <div className="mt-4 pt-4 border-t print:hidden">
                <Link href={`/order/${id}/queue`}>
                  <Button className="w-full bg-amber-500 hover:bg-amber-600">
                    <Clock className="w-4 h-4 mr-2" />
                    Check Live Queue Position
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pickup Info */}
        {order.marketName && (
          <Card className="print:border-gray-300">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-emerald-600 mt-0.5 print:text-gray-700" />
                <div>
                  <h3 className="font-semibold text-gray-900">Pickup Location</h3>
                  <p className="text-gray-600">{order.marketName}</p>
                  {order.status === 'ready' && (
                    <p className="text-sm text-emerald-600 font-medium mt-1 print:text-gray-600">
                      Your order is ready for pickup!
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Details */}
        <Card className="print:border-gray-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Items */}
            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{item.quantity}×</span>
                      <span className="text-gray-700">{item.name}</span>
                    </div>
                    {item.upsellIds && item.upsellIds.length > 0 && (
                      <div className="text-xs text-gray-500 ml-6 mt-0.5">
                        + Extras
                      </div>
                    )}
                  </div>
                  <span className="font-medium text-gray-900">
                    {formatPrice(item.priceCents * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Divider */}
            <div className="border-t my-4" />
            
            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatPrice(order.subtotalCents)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span>{formatPrice(order.taxCents)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span>{formatPrice(order.totalCents)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Info */}
        <Card className="print:border-gray-300">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Order Number</span>
              <span className="font-medium font-mono">{displayOrderId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Order Date</span>
              <span>{formatDate(order.createdAt)}</span>
            </div>
            {order.paymentMethod && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payment Method</span>
                <span className="capitalize">{order.paymentMethod}</span>
              </div>
            )}
            {order.estimatedReadyAt && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Estimated Ready</span>
                <span>{formatDate(order.estimatedReadyAt)}</span>
              </div>
            )}
            {order.customerName && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Customer</span>
                <span>{order.customerName}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions - Hidden in print */}
        <div className="flex gap-3 print:hidden">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => typeof window !== 'undefined' && window.print()}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Receipt
          </Button>
          <Link href="/markets" className="flex-1">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
              Order Again
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center py-6 text-sm text-gray-500 print:hidden">
          <p>Thank you for choosing Gratog! 💚</p>
          <p className="mt-1 text-xs">tasteofgratitude.shop</p>
        </div>
        
        {/* Print Footer */}
        <div className="hidden print:block text-center py-4 border-t text-sm text-gray-600">
          <p>Thank you for your order!</p>
          <p className="mt-1">tasteofgratitude.shop | support@gratog.com</p>
        </div>
      </div>
    </div>
  );
}
