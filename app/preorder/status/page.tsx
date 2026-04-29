'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Ticket, 
  MapPin, 
  Clock, 
  Package, 
  Phone,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Status types
const STATUS_CONFIG = {
  pending: { 
    label: "Pending", 
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
    message: "Your order is in queue"
  },
  preparing: { 
    label: "Preparing", 
    color: "bg-blue-100 text-blue-800",
    icon: Package,
    message: "Your order is being prepared"
  },
  ready: { 
    label: "Ready for Pickup", 
    color: "bg-green-100 text-green-800",
    icon: CheckCircle2,
    message: "Your order is ready!"
  },
  completed: { 
    label: "Completed", 
    color: "bg-gray-100 text-gray-800",
    icon: CheckCircle2,
    message: "Order picked up"
  },
};

interface PreorderStatus {
  waitlistNumber: number;
  currentPosition: number;
  status: keyof typeof STATUS_CONFIG;
  marketName: string;
  marketAddress: string;
  pickupDate: string;
  pickupHours: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  estimatedTime: string;
}

// Mock data - in production, fetch from API
const MOCK_ORDERS: Record<string, PreorderStatus> = {
  "123": {
    waitlistNumber: 15,
    currentPosition: 8,
    status: "pending",
    marketName: "Serenbe Farmers Market",
    marketAddress: "10640 Serenbe Trail, Chattahoochee Hills, GA 30268",
    pickupDate: "Saturday, May 3rd",
    pickupHours: "9:00 AM - 1:00 PM",
    items: [
      { name: "Basil Sea Moss Gel", quantity: 2, price: 25 },
      { name: "Calmwaters", quantity: 1, price: 30 },
    ],
    total: 80,
    estimatedTime: "~16 minutes",
  },
};

function OrderStatusCard({ order }: { order: PreorderStatus }) {
  const status = STATUS_CONFIG[order.status];
  const StatusIcon = status.icon;
  const progress = Math.max(0, 100 - (order.currentPosition / order.waitlistNumber) * 100);

  return (
    <Card className="border-2">
      <CardHeader className="text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Ticket className="w-10 h-10 text-emerald-600" />
        </div>
        <div className="text-sm text-gray-500 mb-1">Your waitlist number</div>
        <div className="text-6xl font-bold text-emerald-600">
          #{order.waitlistNumber}
        </div>
        
        <Badge className={`mt-4 ${status.color}`}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {status.label}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Position in line</span>
            <span className="font-medium">#{order.currentPosition}</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600">{status.message}</p>
          {order.status === 'pending' && (
            <p className="text-sm text-emerald-600 font-medium">
              Estimated wait: {order.estimatedTime}
            </p>
          )}
        </div>

        <Separator />

        {/* Pickup Info */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div>
              <div className="font-medium">{order.marketName}</div>
              <div className="text-sm text-gray-500">{order.marketAddress}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-emerald-600" />
            <div>
              <div className="font-medium">{order.pickupDate}</div>
              <div className="text-sm text-gray-500">{order.pickupHours}</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Order Items */}
        <div>
          <h4 className="font-medium mb-3">Order Summary</h4>
          <div className="space-y-2">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{item.quantity}x {item.name}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-semibold mt-3 pt-3 border-t">
            <span>Total</span>
            <span>${order.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-emerald-50 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-800">
              <p className="font-medium mb-1">Pickup Instructions:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Show your waitlist number at the booth</li>
                <li>Pay with cash or card when you arrive</li>
                <li>Orders are held for 30 minutes after ready</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OrderStatusPage() {
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get("order");
  
  const [orderId, setOrderId] = useState(initialOrderId || "");
  const [order, setOrder] = useState<PreorderStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLookup = async () => {
    if (!orderId.trim()) {
      setError("Please enter your waitlist number");
      return;
    }

    setIsLoading(true);
    setError("");

    // Simulate API call
    setTimeout(() => {
      const found = MOCK_ORDERS[orderId];
      if (found) {
        setOrder(found);
      } else {
        setError("Order not found. Please check your waitlist number.");
        setOrder(null);
      }
      setIsLoading(false);
    }, 500);
  };

  const handleRefresh = () => {
    if (order) {
      // Simulate position update
      setOrder({
        ...order,
        currentPosition: Math.max(1, order.currentPosition - 1),
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-emerald-600 text-white px-4 py-6">
        <div className="max-w-md mx-auto">
          <Link href="/markets" className="flex items-center gap-2 text-emerald-100 hover:text-white mb-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Markets
          </Link>
          <h1 className="text-2xl font-bold">Check Order Status</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-8">
        {!order ? (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Ticket className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h2 className="font-semibold text-lg">Enter your waitlist number</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Check your position in line and order status
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="orderId">
                      <Ticket className="w-4 h-4 inline mr-1" /
                      Waitlist Number
                    </Label>
                    <Input
                      id="orderId"
                      type="text"
                      placeholder="e.g., 123"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      className="mt-1 text-center text-lg"
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                      {error}
                    </div>
                  )}

                  <Button 
                    onClick={handleLookup}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>Checking...t</>
                    ) : (
                      <>Check Status</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                Don't have a waitlist number?{" "}
                <Link href="/markets" className="text-emerald-600 hover:underline">
                  Place a preorder
                </Link>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Button variant="outline" size="sm" onClick={() => setOrder(null)}>
                ← Back
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>

            <OrderStatusCard order={order} />

            <div className="text-center">
              <p className="text-sm text-gray-500">
                Questions? Call or text us at{" "}
                <a href="tel:+1234567890" className="text-emerald-600 hover:underline">
                  (123) 456-7890
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
