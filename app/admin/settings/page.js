'use client';

export const dynamic = 'force-dynamic';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import { logger } from '@/lib/logger';

export default function SettingsPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    adminFetch('/api/admin/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch((error) => logger.error('Admin', 'Failed to fetch user', error));
  }, []);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  async function changePassword(event) {
    event.preventDefault();
    setPasswordError('');
    if (newPassword.length < 12 || newPassword.length > 128) {
      setPasswordError('Use a new password between 12 and 128 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError('Choose a password different from your current password.');
      return;
    }
    setPasswordSaving(true);
    try {
      const result = await adminFetch('/api/admin/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!result.success) {
        setPasswordError(result.error || 'Password update could not be completed.');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      window.location.assign('/admin/login?passwordChanged=1');
    } catch {
      setPasswordError('Connection error. Please try again.');
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your admin account and preferences
        </p>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Name</label>
                <p className="text-lg font-medium">{user.name}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <p className="text-lg font-medium">{user.email}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Role</label>
                <div className="mt-1">
                  <Badge className="bg-[#D4AF37]">{user.role}</Badge>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Loading...</p>
          )}
        </CardContent>
      </Card>

      {/* Change Password: self-service, no email delivery required */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Change Admin Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="max-w-md space-y-4">
            <p className="text-sm text-muted-foreground">Use your current password to set a new one. You will sign in again afterward.</p>
            <label htmlFor="admin-current-password" className="block space-y-1 text-sm font-medium">
              <span>Current password</span>
              <input id="admin-current-password" type="password" autoComplete="current-password" required
                className="w-full rounded-md border bg-background px-3 py-2"
                value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
            </label>
            <label htmlFor="admin-new-password" className="block space-y-1 text-sm font-medium">
              <span>New password (12 characters minimum)</span>
              <input id="admin-new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required
                className="w-full rounded-md border bg-background px-3 py-2"
                value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </label>
            <label htmlFor="admin-confirm-password" className="block space-y-1 text-sm font-medium">
              <span>Confirm new password</span>
              <input id="admin-confirm-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required
                className="w-full rounded-md border bg-background px-3 py-2"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </label>
            {passwordError && <p role="alert" className="text-sm text-red-600">{passwordError}</p>}
            <button type="submit" disabled={passwordSaving}
              className="rounded-md bg-[#D4AF37] px-5 py-2 font-semibold text-black disabled:opacity-50">
              {passwordSaving ? 'Updating password...' : 'Change password'}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            System Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Square Integration</p>
                <p className="text-sm text-muted-foreground">Payment processing enabled</p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Order confirmations and alerts</p>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Inventory Sync</p>
                <p className="text-sm text-muted-foreground">Real-time stock updates</p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
