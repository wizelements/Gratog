'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Send, Calendar, Users, TrendingUp, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, sent: 0, draft: 0, scheduled: 0 });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/campaigns', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      
      const data = await response.json();
      setCampaigns(data.campaigns || []);
      
      // Calculate stats
      const stats = {
        total: data.campaigns.length,
        sent: data.campaigns.filter(c => c.status === 'sent').length,
        draft: data.campaigns.filter(c => c.status === 'draft').length,
        scheduled: data.campaigns.filter(c => c.status === 'scheduled').length
      };
      setStats(stats);
      
    } catch (error) {
      logger.error('Admin', 'Fetch campaigns error', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'secondary',
      scheduled: 'default',
      sending: 'default',
      sent: 'default'
    };
    
    const colors = {
      draft: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-blue-100 text-blue-700',
      sending: 'bg-yellow-100 text-yellow-700',
      sent: 'bg-green-100 text-green-700'
    };
    
    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-700'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-10 w-40 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Email Campaigns</h1>
          <p className="text-muted-foreground mt-1">Create and manage email campaigns with AI-powered content</p>
        </div>
        <Button 
          onClick={() => router.push('/admin/campaigns/new')}
          className="bg-[#059669] hover:bg-[#047857]"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Campaigns</p>
              <p className="text-3xl font-bold mt-1">{stats.total}</p>
            </div>
            <Mail className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sent</p>
              <p className="text-3xl font-bold mt-1 text-green-600">{stats.sent}</p>
            </div>
            <Send className="h-8 w-8 text-green-600" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Drafts</p>
              <p className="text-3xl font-bold mt-1 text-gray-600">{stats.draft}</p>
            </div>
            <Calendar className="h-8 w-8 text-gray-600" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Scheduled</p>
              <p className="text-3xl font-bold mt-1 text-blue-600">{stats.scheduled}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">All Campaigns</h2>
          
          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first email campaign with AI-powered content
              </p>
              <Button 
                onClick={() => router.push('/admin/campaigns/new')}
                className="bg-[#059669] hover:bg-[#047857]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  onClick={() => router.push(`/admin/campaigns/${campaign.id}`)}
                  className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{campaign.name}</h3>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{campaign.subject}</p>
                      
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{campaign.stats?.totalRecipients || 0} recipients</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Send className="h-4 w-4" />
                          <span>{campaign.stats?.sent || 0} sent</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {campaign.sentAt 
                              ? `Sent ${formatDate(campaign.sentAt)}`
                              : `Created ${formatDate(campaign.createdAt)}`
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {campaign.status === 'sent' && campaign.stats?.totalRecipients > 0 && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Delivery Rate</p>
                        <p className="text-2xl font-bold text-green-600">
                          {((campaign.stats.sent / campaign.stats.totalRecipients) * 100).toFixed(0)}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
