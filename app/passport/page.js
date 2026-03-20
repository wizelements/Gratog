'use client';

import { useState, Suspense } from 'react';
import MarketPassport from '@/components/MarketPassport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, QrCode } from 'lucide-react';

function PassportContent() {
  const [customerData, setCustomerData] = useState({
    email: '',
    name: ''
  });
  const [showPassport, setShowPassport] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (customerData.email) {
      setShowPassport(true);
    } else {
      setError('Please enter a valid email address.');
    }
  };

  if (showPassport && customerData.email) {
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
            customerEmail={customerData.email} 
            customerName={customerData.name} 
          />
          
          <div className="mt-6 text-center">
            <Button 
              variant="outline" 
              onClick={() => setShowPassport(false)}
              className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
            >
              Change Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
              Get your digital passport to collect stamps and earn rewards at our markets
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerData.email}
                  onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                  required
                  placeholder="your@email.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Your Name (Optional)</Label>
                <Input
                  id="name"
                  value={customerData.name}
                  onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                  placeholder="Your Name"
                />
              </div>
              
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
                <MapPin className="w-4 h-4 mr-2" />
                Get My Passport
              </Button>
            </form>
            
            <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
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