'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Leaf, KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isMissingParams = !token || !email;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password })
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        toast.success('Password reset successful!');
      } else {
        toast.error(data.error || 'Password reset failed.');
      }
    } catch {
      toast.error('Password reset failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isMissingParams) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-destructive">
          Invalid or missing reset link. Please request a new password reset.
        </p>
        <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
          <Link href="/login">Back to Login</Link>
        </Button>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Your password has been reset successfully. You can now log in with your new password.
        </p>
        <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
          <Link href="/login">Back to Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
          className="border-emerald-200 focus:border-emerald-500"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={isLoading}
          className="border-emerald-200 focus:border-emerald-500"
        />
      </div>
      <Button
        type="submit"
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Resetting...
          </>
        ) : (
          'Reset Password'
        )}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
                <KeyRound className="h-10 w-10 text-emerald-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-emerald-900">
              Reset Password
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter your new password
            </p>
          </CardHeader>
          <CardContent>
            <Suspense fallback={
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              </div>
            }>
              <ResetPasswordForm />
            </Suspense>
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
