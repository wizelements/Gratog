'use client';

import { useState, useEffect } from 'react';
import { useRewardsStore } from '@/stores/rewards';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Copy, 
  Check, 
  Share2, 
  Gift,
  Users,
  Mail,
  Twitter,
  Facebook
} from 'lucide-react';
import { toast } from 'sonner';

export default function ReferralWidget({ variant = 'full' }) {
  const { referralCode, referralCount, generateReferralCode } = useRewardsStore();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !referralCode) {
      const newCode = generateReferralCode();
      setCode(newCode);
    } else if (mounted) {
      setCode(referralCode);
    }
  }, [mounted, referralCode, generateReferralCode]);

  if (!mounted) {
    return null;
  }

  const referralLink = typeof window !== 'undefined' 
    ? `${window.location.origin}?ref=${code}`
    : `https://tasteofgratitude.com?ref=${code}`;

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const shareMessage = `Check out Taste of Gratitude! Use my referral code ${code} to get $5 off your first order. ${referralLink}`;

  const handleTwitterShare = () => {
    const tweetText = encodeURIComponent(`Check out @TasteOfGratitude! Use my referral code ${code} to get $5 off your first order 🌿`);
    const url = encodeURIComponent(referralLink);
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}&url=${url}`, '_blank');
  };

  const handleFacebookShare = () => {
    const url = encodeURIComponent(referralLink);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent('Get $5 off at Taste of Gratitude!');
    const body = encodeURIComponent(`Hey!\n\nI wanted to share Taste of Gratitude with you - they have amazing wellness products.\n\nUse my referral code ${code} to get $5 off your first order!\n\n${referralLink}\n\nEnjoy!`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-50 to-amber-50 rounded-lg border border-emerald-200">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
          <Gift className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-emerald-800">Give $5, Get 100 pts</p>
          <p className="text-xs text-emerald-600 truncate">Code: {code}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleCopy(code)}
          className="flex-shrink-0"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-emerald-800">
              <Gift className="w-6 h-6 text-amber-500" />
              Refer Friends, Earn Rewards
            </CardTitle>
            <CardDescription className="text-emerald-600 mt-1">
              Share the wellness and earn together
            </CardDescription>
          </div>
          {referralCount > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
              <Users className="w-3 h-3 mr-1" />
              {referralCount} Referrals
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 p-4 bg-white rounded-lg border border-emerald-100">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full flex items-center justify-center">
              <span className="text-xl">🎁</span>
            </div>
            <p className="font-bold text-emerald-800">They Get</p>
            <p className="text-2xl font-bold text-amber-600">$5 Off</p>
            <p className="text-xs text-emerald-600">First order</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-xl">⭐</span>
            </div>
            <p className="font-bold text-emerald-800">You Get</p>
            <p className="text-2xl font-bold text-emerald-600">100 pts</p>
            <p className="text-xs text-emerald-600">Per referral</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-emerald-800">Your Referral Code</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={code}
                readOnly
                className="bg-white font-mono text-lg font-bold text-center tracking-wider border-emerald-200"
              />
            </div>
            <Button
              onClick={() => handleCopy(code)}
              variant="outline"
              className="border-emerald-300 hover:bg-emerald-50"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-emerald-800">Share Your Link</label>
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="bg-white text-sm border-emerald-200"
            />
            <Button
              onClick={() => handleCopy(referralLink)}
              variant="outline"
              className="border-emerald-300 hover:bg-emerald-50"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-emerald-800">Share Via</label>
          <div className="grid grid-cols-3 gap-3">
            <Button
              onClick={handleTwitterShare}
              variant="outline"
              className="flex items-center gap-2 border-sky-200 hover:bg-sky-50 text-sky-600"
            >
              <Twitter className="w-4 h-4" />
              <span className="hidden sm:inline">Twitter</span>
            </Button>
            <Button
              onClick={handleFacebookShare}
              variant="outline"
              className="flex items-center gap-2 border-blue-200 hover:bg-blue-50 text-blue-600"
            >
              <Facebook className="w-4 h-4" />
              <span className="hidden sm:inline">Facebook</span>
            </Button>
            <Button
              onClick={handleEmailShare}
              variant="outline"
              className="flex items-center gap-2 border-emerald-200 hover:bg-emerald-50 text-emerald-600"
            >
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Email</span>
            </Button>
          </div>
        </div>

        <div className="text-center pt-2">
          <p className="text-xs text-emerald-600">
            Referral points are credited when your friend makes their first purchase.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
