'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  
  MapPin, 
  Clock, 
  Package, 
  Phone,
  ArrowLeft,
  RefreshCw,
  Loader2,
  // @ts-ignore — auto-fix
  CheckCircle2,
  AlertCircle,
  // @ts-expect-error lucide-react types issue
  Ticket
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { track } from '@/utils/analytics';

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
  orderNumber?: string;
  marketId?: string;
  waitlistNumber: number | string;
  currentPosition: number;
  status: keyof typeof STATUS_CONFIG;
  marketName: string;
  marketAddress?: string;
  pickupDate: string;
  pickupHours: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  estimatedTime?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
}

function normalizeStatus(status: string): keyof typeof STATUS_CONFIG {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PREPARING') return 'preparing';
  if (normalized === 'READY') return 'ready';
  if (normalized === 'PICKED_UP' || normalized === 'COMPLETED') return 'completed';
  return 'pending';
}

function toOrderStatus(preorder: any): PreorderStatus {
  return {
    orderNumber: preorder.orderNumber,
    marketId: preorder.marketId,
    waitlistNumber: preorder.waitlistNumber || preorder.orderNumber,
    currentPosition: Number(preorder.queuePosition || preorder.waitlistPosition || 1),
    status: normalizeStatus(preorder.status),
    marketName: preorder.pickupLocation || preorder.marketName || 'Taste of Gratitude market pickup',
    marketAddress: preorder.marketAddress || '',
    pickupDate: preorder.pickupDate || 'Next market pickup',
    pickupHours: preorder.pickupHours || 'See market details',
    items: Array.isArray(preorder.items) ? preorder.items : [],
    total: Number(preorder.total || preorder.subtotal || 0),
    estimatedTime: preorder.estimatedReadyTime || null,
    customerEmail: preorder.customer?.email || preorder.customerEmail || null,
    customerPhone: preorder.customer?.phone || preorder.customerPhone || null,
  };
}

function getLookupParam(value: string) {
  const trimmed = value.trim();
  const upper = trimmed.toUpperCase();
  const digits = trimmed.replace(/\D/g, '');

  if (upper.startsWith('PRE-')) return { key: 'orderNumber', value: trimmed };
  if (/^[A-Z]{1,3}-/.test(upper)) return { key: 'waitlistNumber', value: trimmed };
  if (digits.length >= 7) return { key: 'phone', value: trimmed };
  return { key: 'waitlistNumber', value: trimmed };
}

function getStatusProgress(status: keyof typeof STATUS_CONFIG, currentPosition: number) {
  if (status === 'completed') return 100;
  if (status === 'ready') return 90;
  if (status === 'preparing') return 65;
  return Math.max(12, Math.min(45, 52 - Math.max(1, currentPosition) * 4));
}

function StatusBanner({ confirm, cancel }: { confirm?: string | null; cancel?: string | null }) {
  if (confirm === 'confirmed') {
    return (
      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
        <strong>Pickup confirmed.</strong> We will have your order ready at the market. You can still check status here anytime.
      </div>
    );
  }
  if (confirm === 'already_confirmed') {
    return (
      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
        Your pickup was already confirmed. See you at the market.
      </div>
    );
  }
  if (cancel === 'cancelled') {
    return (
      <div className="p-4 rounded-xl bg-stone-100 border border-stone-200 text-stone-700 text-sm">
        Your preorder has been cancelled. If this was a mistake, please place a new preorder or contact us.
      </div>
    );
  }
  if (cancel === 'already_cancelled') {
    return (
      <div className="p-4 rounded-xl bg-stone-100 border border-stone-200 text-stone-700 text-sm">
        This order was already cancelled.
      </div>
    );
  }
  return null;
}

function RetentionCTA({ order }: { order: PreorderStatus }) {
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [email, setEmail] = useState(order.customerEmail || '');

  const submit = async (emailToUse: string) => {
    if (!emailToUse || !emailToUse.includes('@')) return;
    setState('submitting');
    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailToUse.toLowerCase().trim(),
          intent: 'weekly_menu_email',
          source: 'preorder_status_followup',
          metadata: {
            marketId: order.marketId || null,
            orderNumber: order.orderNumber || null,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Try again.');
      track('lead_capture_submitted', {
        intent: 'weekly_menu_email',
        source: 'preorder_status_followup',
        hasEmail: true,
        marketId: order.marketId || null,
        orderNumber: order.orderNumber || null,
      });
      setState('success');
    } catch (err: any) {
      track('lead_capture_failed', {
        intent: 'weekly_menu_email',
        source: 'preorder_status_followup',
        error: err.message || 'unknown',
        marketId: order.marketId || null,
      });
      setState('error');
    }
  };

  if (state === 'success') {
    return (
      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
        <strong>You are on the list.</strong> We will email you next week&apos;s menu for this market.
      </div>
    );
  }

  const hasEmail = Boolean(order.customerEmail);

  return (
    <div className="p-4 rounded-xl border border-emerald-100 bg-white">
      <h3 className="font-semibold text-stone-900 text-sm mb-1">Get next week&apos;s menu</h3>
      {hasEmail ? (
        <p className="text-sm text-stone-600 mb-3">
          We can email {order.customerEmail} the menu for {order.marketName || 'this market'} next week.
        </p>
      ) : (
        <p className="text-sm text-stone-600 mb-3">
          Add your email to get the next menu drop. We do not send texts without an explicit text opt-in.
        </p>
      )}
      <div className="flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className="flex-1 text-sm"
          disabled={state === 'submitting'}
        />
        <Button
          onClick={() => submit(email)}
          disabled={state === 'submitting' || !email.includes('@')}
          className="bg-emerald-700 text-white hover:bg-emerald-800 text-sm"
        >
          {state === 'submitting' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Email me the menu'}
        </Button>
      </div>
      {state === 'error' && (
        <p className="text-xs text-red-600 mt-2">Something went wrong. Please try again.</p>
      )}
    </div>
  );
}

function OrderStatusCard({ order }: { order: PreorderStatus }) {
  const status = STATUS_CONFIG[order.status];
  const StatusIcon = status.icon;
  const progress = getStatusProgress(order.status, order.currentPosition);

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
          {order.status === 'pending' && order.estimatedTime && (
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
              {order.marketAddress && <div className="text-sm text-gray-500">{order.marketAddress}</div>}
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

function OrderStatusLoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading order lookup...</p>
      </div>
    </div>
  );
}

export default function OrderStatusPage() {
  return (
    <Suspense fallback={<OrderStatusLoadingFallback />}>
      <OrderStatusContent />
    </Suspense>
  );
}

function OrderStatusContent() {
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get("order");
  
  const [orderId, setOrderId] = useState(initialOrderId || "");
  const [order, setOrder] = useState<PreorderStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoLookupDone, setAutoLookupDone] = useState(false);

  const handleLookup = async (lookupValue = orderId) => {
    if (!lookupValue.trim()) {
      setError("Please enter your waitlist number, preorder number, or phone");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const trimmed = lookupValue.trim();
      const { key: param, value } = getLookupParam(trimmed);
      const response = await fetch(`/api/preorder/status?${param}=${encodeURIComponent(value)}`, {
        cache: 'no-store',
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Preorder not found.');
      }

      const nextOrder = toOrderStatus(data.preorder);
      setOrder(nextOrder);
      track('preorder_status_viewed', {
        orderNumber: nextOrder.orderNumber,
        waitlistNumber: nextOrder.waitlistNumber,
        marketId: nextOrder.marketId || null,
        lookupType: param,
      });
    } catch (err: any) {
      setError(err.message || "Order not found. Please check your number.");
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialOrderId || autoLookupDone) return;
    setAutoLookupDone(true);
    handleLookup(initialOrderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOrderId, autoLookupDone]);

  const handleRefresh = () => {
    if (order) {
      handleLookup();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-emerald-600 text-white px-4 py-6">
        <div className="max-w-md mx-auto">
          <Link href="/markets" className="flex items-center gap-2 text-emerald-100 hover:text-white mb-2">
            <ArrowLeft className="w-4 h-4" />
            &larr; Back to Markets
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
                  <h2 className="font-semibold text-lg">Enter your waitlist, preorder, or phone</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Check your position in line and order status from the live preorder system.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="orderId">
                      <Ticket className="w-4 h-4 inline mr-1" />
                      Waitlist, preorder, or phone
                    </Label>
                    <Input
                      id="orderId"
                      type="text"
                      placeholder="e.g., S-1201, PRE-..., or phone"
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
                    onClick={() => handleLookup()}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>Checking...</>
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
                <Link href="/preorder" className="text-emerald-600 hover:underline">
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

            <StatusBanner confirm={searchParams.get('confirm')} cancel={searchParams.get('cancel')} />

            <RetentionCTA order={order} />

            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild className="rounded-full bg-emerald-700 text-white hover:bg-emerald-800">
                <Link href={order.marketId ? `/preorder?market=${encodeURIComponent(order.marketId)}&utm_source=status_reorder&utm_campaign=weekly_menu_drop` : '/preorder?utm_source=status_reorder&utm_campaign=weekly_menu_drop'}>
                  Reorder for pickup
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                <Link href="/markets">View market details</Link>
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                Questions?{" "}
                <Link href="/contact" className="text-emerald-600 hover:underline">
                  Contact Taste of Gratitude
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
