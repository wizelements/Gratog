'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Loader2 } from 'lucide-react';
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
      const response = await fetch('/api/admin/auth/reset-password', {
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
    } catch (error) {
      logger.error('Admin', 'Password reset error', error);
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
        <Button asChild className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-white">
          <Link href="/admin/login">Back to Login</Link>
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
        <Button asChild className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-white">
          <Link href="/admin/login">Back to Login</Link>
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
        />
      </div>
      <Button
        type="submit"
        className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-white"
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#D4AF37]/10 via-background to-[#8B7355]/10 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-[#D4AF37]/10 rounded-full">
              <KeyRound className="h-10 w-10 text-[#D4AF37]" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gradient-gold">
            Reset Password
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Taste of Gratitude
          </p>
        </CardHeader>
        <CardContent>
          <Suspense fallback={
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#D4AF37]" />
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
