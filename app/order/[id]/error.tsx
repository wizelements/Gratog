'use client';

import Link from 'next/link';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function OrderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isNotFound = error?.message?.toLowerCase().includes('not found') || 
                     error?.message?.toLowerCase().includes('404');

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isNotFound ? 'Order Not Found' : 'Something Went Wrong'}
          </h1>
          
          <p className="text-gray-600 mb-6">
            {isNotFound 
              ? "We couldn't find the order you're looking for. Please check the order number and try again."
              : error?.message || "We encountered an error while loading your order. Please try again."
            }
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              variant="outline" 
              onClick={() => reset()}
              className="flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Link href="/markets">
              <Button className="bg-emerald-600 hover:bg-emerald-700 flex items-center">
                <Home className="w-4 h-4 mr-2" />
                Back to Markets
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
