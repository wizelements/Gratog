'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2, Package, Truck, Mail, MessageSquare } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      // Give webhook time to process
      setTimeout(() => setLoading(false), 2000);
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#D4AF37]/5 to-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-[#D4AF37] mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Processing Your Order</h2>
            <p className="text-muted-foreground">Please wait...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#D4AF37]/5 to-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="text-center py-12">
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
            <p className="text-muted-foreground">
              Thank you for your order. We've received your payment.
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3 text-left p-4 bg-muted/50 rounded-lg">
              <MessageSquare className="h-5 w-5 text-[#D4AF37] mt-0.5" />
              <div>
                <p className="font-semibold text-sm">SMS Confirmation Sent</p>
                <p className="text-xs text-muted-foreground">Check your phone for order details</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-left p-4 bg-muted/50 rounded-lg">
              <Mail className="h-5 w-5 text-[#D4AF37] mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Email Receipt Sent</p>
                <p className="text-xs text-muted-foreground">Check your inbox for your receipt</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-left p-4 bg-[#D4AF37]/10 rounded-lg">
              <Package className="h-5 w-5 text-[#D4AF37] mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Pickup Orders</p>
                <p className="text-xs text-muted-foreground">Ready at Booth 12 after 2:00 PM</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-left p-4 bg-[#D4AF37]/10 rounded-lg">
              <Truck className="h-5 w-5 text-[#D4AF37] mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Delivery Orders</p>
                <p className="text-xs text-muted-foreground">You'll receive tracking updates via SMS</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button asChild className="w-full bg-[#D4AF37] hover:bg-[#B8941F]">
              <Link href="/">Return to Home</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/catalog">Continue Shopping</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            Questions? Reply to your confirmation SMS or email us.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#D4AF37]" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
