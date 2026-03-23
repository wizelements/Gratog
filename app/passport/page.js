'use client';

import { Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MarketPassport from '@/components/MarketPassport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, LogIn } from 'lucide-react';
import Link from 'next/link';

function PassportContent() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 py-8 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-8 h-8 text-emerald-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-emerald-800">
                Market Passport
              </CardTitle>
              <CardDescription className="text-lg">
                Log in to access your digital passport, collect stamps, and earn rewards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/login?redirect=/passport">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <LogIn className="w-4 h-4 mr-2" />
                  Log In to View Passport
                </Button>
              </Link>
              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/register?redirect=/passport" className="text-emerald-600 hover:underline font-medium">
                  Sign up
                </Link>
              </p>
              <div className="p-4 bg-emerald-50 rounded-lg">
                <h4 className="font-medium text-emerald-800 mb-2">How It Works:</h4>
                <div className="space-y-2 text-sm text-emerald-700">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    Show your QR code at any market
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    Collect stamps for visits and purchases
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    Unlock rewards and level up your wellness journey
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-emerald-800 mb-2">
            Your Market Passport
          </h1>
          <p className="text-emerald-600">
            Collect stamps and unlock exclusive rewards
          </p>
        </div>

        <MarketPassport
          customerEmail={user.email}
          customerName={user.name}
        />
      </div>
    </div>
  );
}

export default function PassportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    }>
      <PassportContent />
    </Suspense>
  );
}
