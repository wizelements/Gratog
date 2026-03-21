'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Leaf, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
        toast.success('Check your email for reset instructions.');
      } else {
        toast.error(data.error || 'Request failed. Please try again.');
      }
    } catch {
      toast.error('Request failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <Leaf className="h-8 w-8 text-emerald-600" />
            <span className="text-2xl font-bold text-emerald-900">Taste of Gratitude</span>
          </Link>
        </div>

        <Card className="border-emerald-200 shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-emerald-100 rounded-full">
                <Mail className="h-10 w-10 text-emerald-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-emerald-900">
              Forgot Password
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              We'll send you a link to reset your password
            </p>
          </CardHeader>
          <CardContent>
            {isSubmitted ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  If an account exists with that email, a password reset link has been sent. Check your inbox.
                </p>
                <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Link href="/login">Back to Login</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="border-emerald-200 focus:border-emerald-500"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the email address associated with your account and we'll send you a link to reset your password.
                </p>
                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
                <div className="text-center">
                  <Link
                    href="/login"
                    className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    Back to Login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link href="/" className="text-emerald-600 hover:text-emerald-700 text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
