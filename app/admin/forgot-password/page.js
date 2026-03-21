'use client';

import { useState } from 'react';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/auth/forgot-password', {
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
    } catch (error) {
      logger.error('Admin', 'Forgot password error', error);
      toast.error('Request failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#D4AF37]/10 via-background to-[#8B7355]/10 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-[#D4AF37]/10 rounded-full">
              <Mail className="h-10 w-10 text-[#D4AF37]" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gradient-gold">
            Forgot Password
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Taste of Gratitude
          </p>
        </CardHeader>
        <CardContent>
          {isSubmitted ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                If an account exists with that email, a password reset link has been sent. Check your inbox.
              </p>
              <Button asChild className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-white">
                <Link href="/admin/login">Back to Login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@tasteofgratitude.shop"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the email address associated with your admin account and we'll send you a link to reset your password.
              </p>
              <Button
                type="submit"
                className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-white"
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
                  href="/admin/login"
                  className="text-sm text-[#D4AF37] hover:text-[#B8941F] hover:underline"
                >
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
