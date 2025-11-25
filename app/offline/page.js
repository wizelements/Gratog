'use client';

import Link from 'next/link';
import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-muted rounded-full">
            <WifiOff className="h-16 w-16 text-muted-foreground" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-4">You're Offline</h1>
        
        <p className="text-muted-foreground mb-8">
          It looks like you've lost your internet connection. Don't worry, you can still browse previously visited pages.
        </p>
        
        <div className="space-y-3">
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-[#059669] hover:bg-[#047857]"
          >
            Try Again
          </Button>
          
          <Link href="/">
            <Button variant="outline" className="w-full">
              Go to Homepage
            </Button>
          </Link>
        </div>
        
        <p className="text-sm text-muted-foreground mt-8">
          Your pending orders will be synced automatically when you're back online.
        </p>
      </div>
    </div>
  );
}
