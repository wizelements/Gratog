'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function AdminSetupPage() {
  const [setupSecret, setSetupSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [adminStatus, setAdminStatus] = useState(null);
  const [setupComplete, setSetupComplete] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/admin/setup');
      const data = await response.json();
      setAdminStatus(data);
    } catch (error) {
      logger.error('Admin', 'Failed to check admin status', error);
      toast.error('Failed to check admin status');
    } finally {
      setChecking(false);
    }
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: setupSecret })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Admin user created successfully!');
        setSetupComplete(true);
        checkAdminStatus();
      } else {
        toast.error(data.message || 'Setup failed');
      }
    } catch (error) {
      logger.error('Admin', 'Setup error', error);
      toast.error('Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Checking admin status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D4AF37]/10 via-background to-[#8B7355]/10 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <ShieldCheck className="h-16 w-16 mx-auto text-[#D4AF37] mb-4" />
          <h1 className="text-3xl font-bold mb-2">Admin User Setup</h1>
          <p className="text-muted-foreground">
            Initialize the admin account for Taste of Gratitude
          </p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
            <CardDescription>Check if admin user exists</CardDescription>
          </CardHeader>
          <CardContent>
            {adminStatus?.adminExists ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Admin user exists!</strong>
                  <br />
                  Email: <code className="bg-green-100 px-2 py-1 rounded">{adminStatus.adminEmail}</code>
                  <br />
                  <Link href="/admin/login" className="text-green-600 hover:underline mt-2 inline-block">
                    → Go to Login Page
                  </Link>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>No admin user found</strong>
                  <br />
                  You need to create an admin account to access the dashboard.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Setup Form */}
        {!setupComplete && !adminStatus?.adminExists && (
          <Card>
            <CardHeader>
              <CardTitle>Create Admin User</CardTitle>
              <CardDescription>
                Enter the setup secret to create the admin account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSetup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="secret">Setup Secret</Label>
                  <Input
                    id="secret"
                    type="password"
                    placeholder="Enter setup secret"
                    value={setupSecret}
                    onChange={(e) => setSetupSecret(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Default: <code className="bg-muted px-2 py-1 rounded">setup-admin-2025</code>
                    <br />
                    (Set via ADMIN_SETUP_SECRET environment variable)
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Admin User...
                    </>
                  ) : (
                    'Create Admin User'
                  )}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Default Credentials</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>
                    <strong>Email:</strong>{' '}
                    <code className="bg-blue-100 px-2 py-1 rounded">
                      {process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@tasteofgratitude.shop'}
                    </code>
                  </p>
                  <p>
                    <strong>Password:</strong>{' '}
                    <code className="bg-blue-100 px-2 py-1 rounded">
                      (from ADMIN_DEFAULT_PASSWORD env var)
                    </code>
                  </p>
                  <p className="text-xs mt-2">
                    These credentials will be used to create the admin account.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Message */}
        {setupComplete && (
          <Card className="border-green-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-green-900 mb-2">Setup Complete!</h3>
                <p className="text-green-700 mb-6">
                  Your admin account has been created successfully.
                </p>
                <Link href="/admin/login">
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    Go to Login Page
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <strong>For Local Development:</strong>
              <p className="text-muted-foreground mt-1">
                Run: <code className="bg-muted px-2 py-1 rounded">node scripts/create-admin-user.js</code>
              </p>
            </div>
            <div>
              <strong>For Vercel Production:</strong>
              <p className="text-muted-foreground mt-1">
                Use this page with the setup secret from your environment variables.
              </p>
            </div>
            <div>
              <strong>Forgot Password?</strong>
              <p className="text-muted-foreground mt-1">
                Run the setup again to reset the admin password.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
