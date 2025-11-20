'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { User, Phone, Mail, Save, Loader2, Bell } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [prefLoading, setPrefLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || ''
  });
  const [emailPreferences, setEmailPreferences] = useState({
    marketing: true,
    orderUpdates: true,
    rewards: true,
    challenges: true
  });

  useEffect(() => {
    fetchEmailPreferences();
  }, []);

  const fetchEmailPreferences = async () => {
    try {
      const response = await fetch('/api/user/email-preferences');
      const data = await response.json();
      
      if (data.success) {
        setEmailPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Failed to fetch email preferences:', error);
    } finally {
      setPrefLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Implement API call to update user profile
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-emerald-900 mb-2">Account Settings</h1>
        <p className="text-emerald-600">Manage your account information</p>
      </div>

      {/* Profile Information */}
      <Card className="border-emerald-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-emerald-900 flex items-center gap-2">
            <User className="h-5 w-5 text-emerald-600" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className="border-emerald-200 focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                disabled
                className="border-emerald-200 bg-gray-50"
              />
              <p className="text-sm text-emerald-600">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(555) 123-4567"
                className="border-emerald-200 focus:border-emerald-500"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card className="border-emerald-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-emerald-900">Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
              <span className="text-emerald-900 font-medium">Member Since</span>
              <span className="text-emerald-600">
                {user?.joinedAt
                  ? new Date(user.joinedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
              <span className="text-emerald-900 font-medium">Account Status</span>
              <span className="text-emerald-600 font-semibold">Active</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Preferences */}
      <Card className="border-emerald-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-emerald-900 flex items-center gap-2">
            <Bell className="h-5 w-5 text-emerald-600" />
            Email Preferences
          </CardTitle>
          <CardDescription>Manage which emails you want to receive</CardDescription>
        </CardHeader>
        <CardContent>
          {prefLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-600" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-emerald-100 rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="marketing" className="text-base font-medium text-emerald-900">
                    Marketing Emails
                  </Label>
                  <p className="text-sm text-emerald-600 mt-1">
                    Receive updates about new products, promotions, and events
                  </p>
                </div>
                <Switch
                  id="marketing"
                  checked={emailPreferences.marketing}
                  onCheckedChange={(checked) => handlePreferenceChange('marketing', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-emerald-100 rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="orderUpdates" className="text-base font-medium text-emerald-900">
                    Order Updates
                  </Label>
                  <p className="text-sm text-emerald-600 mt-1">
                    Receive confirmations and updates about your orders
                  </p>
                </div>
                <Switch
                  id="orderUpdates"
                  checked={emailPreferences.orderUpdates}
                  onCheckedChange={(checked) => handlePreferenceChange('orderUpdates', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-emerald-100 rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="rewards" className="text-base font-medium text-emerald-900">
                    Rewards & Points
                  </Label>
                  <p className="text-sm text-emerald-600 mt-1">
                    Get notified when you earn points or unlock rewards
                  </p>
                </div>
                <Switch
                  id="rewards"
                  checked={emailPreferences.rewards}
                  onCheckedChange={(checked) => handlePreferenceChange('rewards', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-emerald-100 rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="challenges" className="text-base font-medium text-emerald-900">
                    Challenge Updates
                  </Label>
                  <p className="text-sm text-emerald-600 mt-1">
                    Receive updates about your wellness streak and milestones
                  </p>
                </div>
                <Switch
                  id="challenges"
                  checked={emailPreferences.challenges}
                  onCheckedChange={(checked) => handlePreferenceChange('challenges', checked)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

  const handlePreferenceChange = async (key, value) => {
    const newPreferences = {
      ...emailPreferences,
      [key]: value
    };
    
    setEmailPreferences(newPreferences);

    try {
      const response = await fetch('/api/user/email-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: newPreferences })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Email preferences updated');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
      toast.error('Failed to update preferences');
      // Revert on error
      setEmailPreferences(emailPreferences);
    }
  };
