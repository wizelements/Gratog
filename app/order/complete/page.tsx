'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

export default function OrderCompletePage() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    if (orderNumber) {
      checkPaymentStatus();
      // Poll for status
      const interval = setInterval(checkPaymentStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [orderNumber]);

  const checkPaymentStatus = async () => {
    try {
      const response = await fetch(`/api/orders/${orderNumber}/status`);
      if (response.ok) {
        const data = await response.json();
        setOrderData(data.order);
        
        if (data.order.status === 'CONFIRMED') {
          setStatus('success');
        } else if (data.order.status === 'PENDING_PAYMENT') {
          // Still waiting
        } else {
          setStatus('error');
        }
      }
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <h1 className="text-xl font-bold">Processing Payment...</h1>
          <p className="text-muted-foreground mt-2">
            Please wait while we confirm your payment.
          </p>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-500" />
          <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-muted-foreground mb-4">
            Your order #{orderNumber} has been confirmed.
          </p>
          
          <Link href={`/order/status/${orderNumber}`}>
            <Button className="w-full">
              Track Order Status
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="p-8 text-center max-w-md">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-amber-500" />
        <h1 className="text-2xl font-bold mb-2">Payment Pending</h1>
        <p className="text-muted-foreground mb-4">
          We haven't received confirmation yet. If you completed payment, 
          please check your email or contact support.
        </p>
        
        <div className="flex gap-3">
          <Button variant="outline" onClick={checkPaymentStatus}>
            Check Again
          </Button>
          <Link href={`/order/status/${orderNumber}`}>
            <Button>View Status</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
