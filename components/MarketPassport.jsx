'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { QrCode, Stamp, Gift, Trophy, Star, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

// Dynamically import QRCode to avoid SSR issues
const generateQRCode = async (data) => {
  const { default: QRCode } = await import('qrcode');
  return QRCode.toDataURL(data, {
    width: 200,
    margin: 2,
    color: {
      dark: '#065f46', // emerald-800
      light: '#ffffff'
    }
  });
};
import AnalyticsSystem from '@/lib/analytics';

const REWARD_TIERS = [
  { stamps: 2, reward: 'Free 2oz Shot', icon: Gift, color: 'text-emerald-600' },
  { stamps: 5, reward: '15% Off Next Purchase', icon: Star, color: 'text-yellow-600' },
  { stamps: 10, reward: 'Level Up: Enthusiast', icon: Trophy, color: 'text-purple-600' }
];

export default function MarketPassport({ customerEmail, customerName }) {
  const [passport, setPassport] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (customerEmail) {
      loadPassport();
    }
  }, [customerEmail]);

  const loadPassport = async () => {
    try {
      setLoading(true);
      
      // Try to get existing passport
      let response = await fetch(`/api/rewards/passport?email=${encodeURIComponent(customerEmail)}`);
      
      if (!response.ok && response.status === 404) {
        // Create new passport
        response = await fetch('/api/rewards/passport', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerEmail, customerName })
        });
      }
      
      if (response.ok) {
        const data = await response.json();
        setPassport(data.passport);
        
        // Generate QR code for passport
        const qrData = JSON.stringify({
          type: 'market_passport',
          passportId: data.passport.id,
          customerEmail: data.passport.customerEmail
        });
        
        const qrUrl = await generateQRCode(qrData);
        setQrCodeUrl(qrUrl);
      } else {
        throw new Error('Failed to load passport');
      }
    } catch (error) {
      console.error('Passport error:', error);
      toast.error('Unable to load your market passport');
    } finally {
      setLoading(false);
    }
  };

  const simulateStamp = async (marketName) => {
    if (!passport) return;
    
    try {
      setScanning(true);
      
      const response = await fetch('/api/rewards/stamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passportId: passport.id,
          marketName,
          activityType: 'visit'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update passport
        setPassport(data.passport);
        
        // Show success and any new rewards
        toast.success(`Stamped at ${marketName}! 🎆`);
        
        AnalyticsSystem.trackPassportStampAdded(marketName, data.passport.totalStamps);
        
        if (data.rewards.length > 0) {
          data.rewards.forEach(reward => {
            toast.success(`🎉 ${reward.title}`, {
              description: reward.description,
              duration: 5000
            });
            AnalyticsSystem.trackRewardUnlocked(reward.type, reward.title);
          });
        }
      } else {
        throw new Error('Failed to add stamp');
      }
    } catch (error) {
      console.error('Stamp error:', error);
      toast.error('Failed to add stamp. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const getProgressToNextReward = () => {
    if (!passport) return { progress: 0, next: null };
    
    const nextTier = REWARD_TIERS.find(tier => tier.stamps > passport.totalStamps);
    if (!nextTier) return { progress: 100, next: null };
    
    const prevTier = REWARD_TIERS.filter(tier => tier.stamps <= passport.totalStamps).pop();
    const prevStamps = prevTier ? prevTier.stamps : 0;
    
    const progress = ((passport.totalStamps - prevStamps) / (nextTier.stamps - prevStamps)) * 100;
    
    return { progress, next: nextTier };
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </CardContent>
      </Card>
    );
  }

  if (!passport) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Unable to load your passport</p>
          <Button onClick={loadPassport} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { progress, next } = getProgressToNextReward();

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Passport Card */}
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <CardTitle className="text-emerald-800">Market Passport</CardTitle>
          </div>
          <CardDescription className="text-emerald-700">
            {passport.customerName || 'Wellness Explorer'}
          </CardDescription>
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
            Level: {passport.level}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="Market Passport QR Code" className="w-32 h-32" />
              ) : (
                <QrCode className="w-32 h-32 text-gray-400" />
              )}
            </div>
          </div>
          
          <div className="text-center text-sm text-emerald-700">
            Show this QR code at any market to collect stamps
          </div>
          
          {/* Stamps Counter */}
          <div className="flex items-center justify-center gap-4 py-2">
            <div className="flex items-center gap-2">
              <Stamp className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-emerald-800">
                {passport.totalStamps} stamps
              </span>
            </div>
            <div className="text-sm text-emerald-600">
              {passport.xpPoints} XP
            </div>
          </div>
          
          {/* Progress to Next Reward */}
          {next && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-emerald-700">Progress to next reward</span>
                <span className="text-emerald-600 font-medium">
                  {passport.totalStamps}/{next.stamps} stamps
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="text-xs text-center text-emerald-600">
                {next.stamps - passport.totalStamps} more stamps until: {next.reward}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Active Vouchers */}
      {passport.vouchers && passport.vouchers.filter(v => !v.used).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gift className="w-5 h-5 text-emerald-600" />
              Available Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {passport.vouchers
                .filter(v => !v.used)
                .map((voucher) => (
                  <div key={voucher.id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                    <div>
                      <div className="font-medium text-emerald-800">
                        {voucher.title}
                      </div>
                      <div className="text-sm text-emerald-600">
                        Code: {voucher.code}
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700">
                      Active
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Demo Stamp Buttons (development only) */}
      {process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true' && (
        <Card className="border-dashed border-2 border-gray-300">
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Demo: Simulate Market Visits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => simulateStamp('Serenbe')}
                disabled={scanning}
              >
                Stamp: Serenbe
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => simulateStamp('East Atlanta Village')}
                disabled={scanning}
              >
                Stamp: EAV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}