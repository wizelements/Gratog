'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Video, Upload, Instagram, Clock, Gift, Star } from 'lucide-react';
import { toast } from 'sonner';
import AnalyticsSystem from '@/lib/analytics';

const CHALLENGE_STEPS = [
  {
    number: 1,
    title: 'Get Your Spicy Bloom Shot',
    description: 'Purchase or reserve your Spicy Bloom shot at any market or online',
    icon: Gift
  },
  {
    number: 2,
    title: 'Record Your 10-Second Bloom',
    description: 'Capture your reaction during the 10 seconds of flavor bloom',
    icon: Video
  },
  {
    number: 3,
    title: 'Post & Tag',
    description: 'Share on Instagram or TikTok with #SpicyBloomChallenge #TasteOfGratitude',
    icon: Instagram
  },
  {
    number: 4,
    title: 'Submit Your Entry',
    description: 'Fill out the form below to enter the monthly raffle',
    icon: Upload
  }
];

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: '📸' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵' },
  { id: 'twitter', name: 'Twitter/X', icon: '🐦' },
  { id: 'youtube', name: 'YouTube', icon: '📺' },
  { id: 'facebook', name: 'Facebook', icon: '👥' }
];

export default function UGCChallenge() {
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    socialHandle: '',
    platform: '',
    contentUrl: '',
    consent: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.consent) {
      toast.error('Please agree to the terms and conditions');
      return;
    }
    
    if (!formData.contentUrl) {
      toast.error('Please provide a link to your content');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const response = await fetch('/api/ugc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge: 'spicy_bloom',
          ...formData
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubmitted(true);
        toast.success('Entry submitted successfully! 🎉', {
          description: 'You\'re now entered in the monthly raffle. Good luck!'
        });
        AnalyticsSystem.trackUGCSubmitted('spicy_bloom', formData.platform);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit');
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit entry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="text-center py-12">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Star className="w-10 h-10 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-bold text-emerald-800 mb-2">
            Entry Submitted! 🎉
          </h3>
          <p className="text-emerald-600 mb-6">
            You're now entered in our monthly raffle for exclusive Taste of Gratitude prizes!
          </p>
          <div className="space-y-3 text-sm text-gray-600">
            <p>• Winners announced on the last Friday of each month</p>
            <p>• Follow us on social media for updates</p>
            <p>• Keep sharing your wellness journey!</p>
          </div>
          <Button 
            onClick={() => setSubmitted(false)}
            className="mt-6 bg-emerald-600 hover:bg-emerald-700"
          >
            Submit Another Entry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Challenge Header */}
      <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-orange-800 flex items-center justify-center gap-2">
            <span className="text-4xl">🌶️</span>
            Spicy Bloom Challenge
          </CardTitle>
          <CardDescription className="text-lg text-orange-700">
            Experience the 10-second flavor journey and share your reaction for a chance to win exclusive prizes!
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Challenge Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {CHALLENGE_STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <Card key={step.number} className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="text-sm font-medium text-emerald-800 mb-1">
                  Step {step.number}
                </div>
                <h4 className="font-semibold mb-2">{step.title}</h4>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Submission Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-600" />
            Submit Your Entry
          </CardTitle>
          <CardDescription>
            Share your Spicy Bloom experience and enter our monthly raffle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Your Name *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email Address *</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="socialHandle">Social Media Handle</Label>
                <Input
                  id="socialHandle"
                  placeholder="@yourhandle"
                  value={formData.socialHandle}
                  onChange={(e) => handleInputChange('socialHandle', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform">Platform *</Label>
                <Select onValueChange={(value) => handleInputChange('platform', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((platform) => (
                      <SelectItem key={platform.id} value={platform.id}>
                        <span className="flex items-center gap-2">
                          <span>{platform.icon}</span>
                          {platform.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contentUrl">Link to Your Post *</Label>
              <Input
                id="contentUrl"
                type="url"
                placeholder="https://..."
                value={formData.contentUrl}
                onChange={(e) => handleInputChange('contentUrl', e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                Paste the direct link to your Instagram post, TikTok video, or other social media content
              </p>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="consent"
                checked={formData.consent}
                onCheckedChange={(checked) => handleInputChange('consent', checked)}
                required
              />
              <Label htmlFor="consent" className="text-sm leading-5">
                I consent to Taste of Gratitude featuring my content in marketing materials and social media. 
                I confirm this content is original and I have the right to share it. *
              </Label>
            </div>

            <Button 
              type="submit" 
              disabled={submitting || !formData.consent}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? 'Submitting...' : 'Submit Entry & Enter Raffle'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Prize Info */}
      <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
        <CardContent className="py-6">
          <div className="text-center">
            <h3 className="text-xl font-bold text-yellow-800 mb-4">
              🏆 Monthly Raffle Prizes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-yellow-700">1st Prize</div>
                <div className="text-yellow-600">$100 Product Bundle + Exclusive Merch</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-yellow-700">2nd Prize</div>
                <div className="text-yellow-600">$50 Product Credit</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-yellow-700">3rd Prize</div>
                <div className="text-yellow-600">Free Starter Trio Bundle</div>
              </div>
            </div>
            <p className="text-xs text-yellow-600 mt-4">
              Winners announced on the last Friday of each month. Must be 18+ to participate.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}