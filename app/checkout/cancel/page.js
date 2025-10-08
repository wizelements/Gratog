import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { XCircle } from 'lucide-react';

export default function CancelPage() {
  return (
    <div className="container py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Checkout Cancelled</h1>
              <p className="text-muted-foreground mb-6">
                Your payment was cancelled. No charges were made to your account.
              </p>
              <div className="flex flex-col gap-3">
                <Button asChild className="bg-[#D4AF37] hover:bg-[#B8941F] text-white">
                  <Link href="/catalog">Back to Catalog</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/">Return to Home</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
