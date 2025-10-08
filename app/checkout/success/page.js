'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2, XCircle, Clock } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('loading');
  const [paymentInfo, setPaymentInfo] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    const pollPaymentStatus = async (attempts = 0) => {
      const maxAttempts = 5;
      const pollInterval = 2000;

      if (attempts >= maxAttempts) {
        setStatus('timeout');
        return;
      }

      try {
        const response = await fetch(`/api/checkout/status/${sessionId}`);

        if (!response.ok) {
          throw new Error('Failed to check payment status');
        }

        const data = await response.json();
        setPaymentInfo(data);

        if (data.payment_status === 'paid') {
          setStatus('success');
          return;
        } else if (data.status === 'expired') {
          setStatus('expired');
          return;
        }

        setStatus('pending');
        setTimeout(() => pollPaymentStatus(attempts + 1), pollInterval);
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('error');
      }
    };

    pollPaymentStatus();
  }, [sessionId]);

  return (
    <div className="container py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <CardContent className="pt-6">
            {status === 'loading' && (
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-[#D4AF37] mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Checking Payment Status</h2>
                <p className="text-muted-foreground">Please wait while we verify your payment...</p>
              </div>
            )}

            {status === 'pending' && (
              <div className="text-center">
                <Clock className="h-12 w-12 text-[#D4AF37] mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Processing Payment</h2>
                <p className="text-muted-foreground">Your payment is being processed...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
                <p className="text-muted-foreground mb-4">
                  Thank you for your purchase. Your order has been confirmed.
                </p>
                {paymentInfo && (
                  <div className="bg-muted p-4 rounded-lg mb-6 text-left">
                    <p className="text-sm mb-2">
                      <span className="font-semibold">Amount:</span>{' '}
                      ${(paymentInfo.amount_total / 100).toFixed(2)} {paymentInfo.currency.toUpperCase()}
                    </p>
                    {paymentInfo.customer_details?.email && (
                      <p className="text-sm">
                        <span className="font-semibold">Email:</span>{' '}
                        {paymentInfo.customer_details.email}
                      </p>
                    )}
                  </div>
                )}
                <p className="text-sm text-muted-foreground mb-6">
                  A confirmation email has been sent to your email address.
                </p>
                <div className="flex flex-col gap-3">
                  <Button asChild className="bg-[#D4AF37] hover:bg-[#B8941F] text-white">
                    <Link href="/catalog">Continue Shopping</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/">Return to Home</Link>
                  </Button>
                </div>
              </div>
            )}

            {status === 'expired' && (
              <div className="text-center">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Session Expired</h2>
                <p className="text-muted-foreground mb-6">
                  Your payment session has expired. Please try again.
                </p>
                <Button asChild className="bg-[#D4AF37] hover:bg-[#B8941F] text-white">
                  <Link href="/catalog">Back to Catalog</Link>
                </Button>
              </div>
            )}

            {status === 'timeout' && (
              <div className="text-center">
                <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Status Check Timeout</h2>
                <p className="text-muted-foreground mb-6">
                  We couldn't verify your payment status. Please check your email for confirmation or contact support.
                </p>
                <div className="flex flex-col gap-3">
                  <Button asChild className="bg-[#D4AF37] hover:bg-[#B8941F] text-white">
                    <Link href="/contact">Contact Support</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/">Return to Home</Link>
                  </Button>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Error</h2>
                <p className="text-muted-foreground mb-6">
                  There was an error checking your payment status. Please contact support.
                </p>
                <div className="flex flex-col gap-3">
                  <Button asChild className="bg-[#D4AF37] hover:bg-[#B8941F] text-white">
                    <Link href="/contact">Contact Support</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/">Return to Home</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="container py-16 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#D4AF37] mx-auto" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
