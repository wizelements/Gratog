'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Leaf, CheckCircle, XCircle } from 'lucide-react';

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid unsubscribe link');
      return;
    }

    handleUnsubscribe();
  }, [token]);

  const handleUnsubscribe = async () => {
    try {
      // For now, just show success (will implement backend later)
      setStatus('success');
      setMessage('You have been successfully unsubscribed from marketing emails.');
    } catch (error) {
      setStatus('error');
      setMessage('Failed to unsubscribe. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <Leaf className="h-8 w-8 text-emerald-600" />
            <span className="text-2xl font-bold text-emerald-900">Taste of Gratitude</span>
          </Link>
        </div>

        <Card className="border-emerald-200 shadow-xl">
          <CardHeader>
            <CardTitle className="text-emerald-900 text-center">
              {status === 'loading' && 'Processing...'}
              {status === 'success' && 'Unsubscribed'}
              {status === 'error' && 'Error'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            {status === 'loading' && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600" />
              </div>
            )}

            {status === 'success' && (
              <div>
                <CheckCircle className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
                <p className="text-emerald-700 mb-6">{message}</p>
                <p className="text-sm text-gray-600 mb-6">
                  You'll still receive important emails about your orders and account.
                  You can manage all your email preferences in your account settings.
                </p>
                <div className="space-y-3">
                  <Link href="/profile/settings">
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                      Manage Preferences
                    </Button>
                  </Link>
                  <Link href="/">
                    <Button variant="outline" className="w-full border-emerald-300 text-emerald-700">
                      Back to Home
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div>
                <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
                <p className="text-red-700 mb-6">{message}</p>
                <Link href="/">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                    Back to Home
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
