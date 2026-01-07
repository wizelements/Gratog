'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clientLogger as logger } from '@/lib/client-logger';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, Send, Eye, Save, Users, ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [estimatedRecipients, setEstimatedRecipients] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  
  // Campaign data
  const [campaignData, setCampaignData] = useState({
    name: '',
    subject: '',
    preheader: '',
    body: '',
    segmentCriteria: {},
    scheduledFor: null
  });

  // AI generation options
  const [aiOptions, setAiOptions] = useState({
    type: 'promotional',
    tone: 'warm',
    length: 'medium',
    customPrompt: ''
  });

  // Segment builder
  const [segments, setSegments] = useState({
    purchaseFrequency: '',
    purchaseAmount: '',
    rewardsTier: '',
    challengeParticipation: '',
    inactive: false
  });

  // Fetch estimated recipients when segments change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEstimatedRecipients();
    }, 500);
    return () => clearTimeout(timer);
  }, [segments]);

  const fetchEstimatedRecipients = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(segments).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`/api/admin/customers?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setEstimatedRecipients(data.count || 0);
    } catch (error) {
      logger.error('Admin', 'Failed to fetch recipients', error);
    }
  };

  const sendTestEmail = async () => {
    if (!campaignData.subject || !campaignData.body) {
      toast.error('Please add subject and content first');
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch('/api/admin/campaigns/test', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: campaignData.subject,
          preheader: campaignData.preheader,
          body: campaignData.body
        })
      });
      
      if (!response.ok) throw new Error('Failed to send test');
      
      const data = await response.json();
      if (data.success) {
        toast.success(`Test email sent to ${data.sentTo}`);
      } else {
        throw new Error(data.error || 'Failed to send');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to send test email');
    } finally {
      setLoading(false);
    }
  };

  const generateWithAI = async () => {
    if (generating) return;
    
    try {
      setGenerating(true);
      toast.info('Generating newsletter with AI...');

      const response = await fetch('/api/admin/campaigns/generate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(aiOptions)
      });

      if (!response.ok) throw new Error('AI generation failed');

      const data = await response.json();
      
      if (data.success && data.content) {
        setCampaignData(prev => ({
          ...prev,
          subject: data.content.subject,
          preheader: data.content.preheader,
          body: data.content.body
        }));
        toast.success('Newsletter generated successfully!');
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error) {
      logger.error('Admin', 'AI generation error', error);
      toast.error(error.message || 'Failed to generate newsletter');
    } finally {
      setGenerating(false);
    }
  };

  const saveCampaign = async (asDraft = true) => {
    try {
      // Client-side validation
      if (!campaignData.name || !campaignData.subject || !campaignData.body) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Validate scheduled time if provided
      if (campaignData.scheduledFor) {
        const scheduledDate = new Date(campaignData.scheduledFor);
        if (Number.isNaN(scheduledDate.getTime())) {
          toast.error('Invalid scheduled date/time');
          return;
        }
        if (scheduledDate < new Date()) {
          toast.error('Scheduled send time must be in the future');
          return;
        }
      }

      setLoading(true);

      const response = await fetch('/api/admin/campaigns', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...campaignData,
          segmentCriteria: segments,
          scheduledFor: campaignData.scheduledFor
        })
      });

      // Parse response body to get error details
      let data = null;
      try {
        data = await response.json();
      } catch {
        // Non-JSON response
      }

      if (!response.ok) {
        // Handle auth errors
        if (response.status === 401 || response.status === 403) {
          toast.error(data?.error || 'Your admin session has expired');
          return;
        }
        // Throw with server error message
        throw new Error(data?.error || `Request failed with status ${response.status}`);
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to create campaign');
      }

      toast.success(`Campaign ${asDraft ? 'saved as draft' : 'created'}!`);
      router.push('/admin/campaigns');
    } catch (error) {
      logger.error('Admin', 'Save campaign error', error);
      toast.error(error.message || 'Failed to save campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create New Campaign</h1>
          <p className="text-muted-foreground mt-1">Design and send email campaigns with AI-powered content</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Details */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Campaign Details</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Summer Wellness Sale"
                  value={campaignData.name}
                  onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="subject">Email Subject *</Label>
                <Input
                  id="subject"
                  placeholder="e.g., Your Summer Wellness Journey Starts Here"
                  value={campaignData.subject}
                  onChange={(e) => setCampaignData({ ...campaignData, subject: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="preheader">Preheader Text</Label>
                <Input
                  id="preheader"
                  placeholder="Preview text that appears after subject line"
                  value={campaignData.preheader}
                  onChange={(e) => setCampaignData({ ...campaignData, preheader: e.target.value })}
                />
              </div>
            </div>
          </Card>

          {/* AI Content Generator */}
          <Card className="p-6 border-[#D4AF37] border-2">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-[#D4AF37]" />
              <h2 className="text-lg font-semibold">AI Content Generator</h2>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="type">Newsletter Type</Label>
                  <Select value={aiOptions.type} onValueChange={(value) => setAiOptions({ ...aiOptions, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="promotional">Promotional</SelectItem>
                      <SelectItem value="educational">Educational</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="seasonal">Seasonal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tone">Tone</Label>
                  <Select value={aiOptions.tone} onValueChange={(value) => setAiOptions({ ...aiOptions, tone: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warm">Warm</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="playful">Playful</SelectItem>
                      <SelectItem value="inspirational">Inspirational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="length">Length</Label>
                  <Select value={aiOptions.length} onValueChange={(value) => setAiOptions({ ...aiOptions, length: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="long">Long</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="customPrompt">Additional Instructions (Optional)</Label>
                <Textarea
                  id="customPrompt"
                  placeholder="e.g., Include information about our new product line, mention 20% discount..."
                  value={aiOptions.customPrompt}
                  onChange={(e) => setAiOptions({ ...aiOptions, customPrompt: e.target.value })}
                  rows={3}
                />
              </div>

              <Button 
                onClick={generateWithAI}
                disabled={generating}
                className="w-full bg-gradient-to-r from-[#059669] to-[#14b8a6] hover:opacity-90"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {generating ? 'Generating...' : 'Generate Content with AI'}
              </Button>
            </div>
          </Card>

          {/* Email Body */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Email Content *</h2>
            <Textarea
              placeholder="Paste or write your email content here (HTML supported)"
              value={campaignData.body}
              onChange={(e) => setCampaignData({ ...campaignData, body: e.target.value })}
              rows={15}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Tip: Use HTML for formatting. The AI generator creates HTML content automatically.
            </p>
          </Card>
        </div>

        {/* Sidebar - Right Column */}
        <div className="space-y-6">
          {/* Audience Targeting */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Audience</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{estimatedRecipients} recipients</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="purchaseFrequency">Purchase Frequency</Label>
                <Select 
                  value={segments.purchaseFrequency || "all"} 
                  onValueChange={(value) => setSegments({ ...segments, purchaseFrequency: value === "all" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All customers</SelectItem>
                    <SelectItem value="first-time">First-time buyers</SelectItem>
                    <SelectItem value="repeat">Repeat customers</SelectItem>
                    <SelectItem value="loyal">Loyal customers (5+ orders)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="purchaseAmount">Lifetime Value</Label>
                <Select 
                  value={segments.purchaseAmount || "all"} 
                  onValueChange={(value) => setSegments({ ...segments, purchaseAmount: value === "all" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All ranges" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ranges</SelectItem>
                    <SelectItem value="low">Low ($0-$50)</SelectItem>
                    <SelectItem value="medium">Medium ($50-$200)</SelectItem>
                    <SelectItem value="high">High ($200+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="rewardsTier">Rewards Tier</Label>
                <Select 
                  value={segments.rewardsTier || "all"} 
                  onValueChange={(value) => setSegments({ ...segments, rewardsTier: value === "all" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All tiers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tiers</SelectItem>
                    <SelectItem value="bronze">Bronze (&lt; 500 pts)</SelectItem>
                    <SelectItem value="silver">Silver (500-1000 pts)</SelectItem>
                    <SelectItem value="gold">Gold (1000+ pts)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="challengeParticipation">Challenge Activity</Label>
                <Select 
                  value={segments.challengeParticipation || "all"} 
                  onValueChange={(value) => setSegments({ ...segments, challengeParticipation: value === "all" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active (3+ day streak)</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="inactive"
                  checked={segments.inactive}
                  onCheckedChange={(checked) => setSegments({ ...segments, inactive: checked })}
                />
                <Label htmlFor="inactive" className="text-sm font-normal">
                  Inactive customers only (no orders in 60 days)
                </Label>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Actions</h2>
            <div className="space-y-3">
              {/* Schedule Option */}
              <div className="space-y-2">
                <Label>Schedule Send (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={campaignData.scheduledFor ? new Date(campaignData.scheduledFor).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setCampaignData({ 
                    ...campaignData, 
                    scheduledFor: e.target.value ? new Date(e.target.value).toISOString() : null 
                  })}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to save as draft
                </p>
              </div>

              <Button
                variant="outline"
                onClick={sendTestEmail}
                disabled={loading || !campaignData.body}
                className="w-full"
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Test to Myself
              </Button>

              <Button
                onClick={() => saveCampaign(true)}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                Save as Draft
              </Button>
              
              <Button
                onClick={() => saveCampaign(false)}
                disabled={loading || !campaignData.name || !campaignData.subject || !campaignData.body}
                className="w-full bg-[#059669] hover:bg-[#047857]"
              >
                <Send className="h-4 w-4 mr-2" />
                Create & Review
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowPreview(true)}
                disabled={!campaignData.body}
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Email
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-[#059669] to-[#14b8a6] p-8 text-center">
              <h1 className="text-2xl font-bold text-white">Taste of Gratitude</h1>
              {campaignData.preheader && (
                <p className="text-white/80 mt-2 text-sm">{campaignData.preheader}</p>
              )}
            </div>
            <div className="p-6 bg-white">
              <p className="text-sm text-gray-500 mb-4">Subject: <strong>{campaignData.subject || '(No subject)'}</strong></p>
              {/* SAFE: Admin-only email preview. Content is from authenticated admin, not user input */}
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: campaignData.body || '<p>No content yet</p>' }}
              />
            </div>
            <div className="bg-gray-100 p-4 text-center text-sm text-gray-500 border-t">
              <p>© {new Date().getFullYear()} Taste of Gratitude. All rights reserved.</p>
              <p className="text-xs mt-1 text-gray-400">Unsubscribe from marketing emails</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
