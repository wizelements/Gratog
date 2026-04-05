import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { PERMISSIONS } from '@/lib/security';
import { withAdminMiddleware, AuthenticatedRequest } from '@/lib/middleware/admin';
import { CampaignCreateSchema, validateBody, sanitizeHtml } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { ObjectId } from 'mongodb';

// ============================================================================
// CAMPAIGN TYPES
// ============================================================================

interface Campaign {
  _id?: ObjectId;
  id: string;
  name: string;
  subject: string;
  preheader?: string;
  body: string;
  bodyHtml?: string;
  segmentCriteria: Record<string, unknown>;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduledFor?: Date;
  sentAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  stats?: {
    totalRecipients: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
  };
}

// ============================================================================
// GET - List campaigns
// ============================================================================

export const GET = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const status = searchParams.get('status')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;
    
    try {
      const { db } = await connectToDatabase();
      
      // Build query
      const query: Record<string, unknown> = {};
      
      if (status) {
        const allowedStatuses = ['draft', 'scheduled', 'sending', 'sent', 'failed'];
        if (allowedStatuses.includes(status)) {
          query.status = status;
        }
      }
      
      // Get campaigns with pagination
      const [campaigns, total] = await Promise.all([
        db.collection('campaigns')
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray() as Promise<Campaign[]>,
        db.collection('campaigns').countDocuments(query),
      ]);
      
      // Sanitize response - remove raw HTML bodies for list view
      const sanitizedCampaigns = campaigns.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        preheader: campaign.preheader,
        status: campaign.status,
        scheduledFor: campaign.scheduledFor,
        sentAt: campaign.sentAt,
        createdBy: campaign.createdBy,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
        stats: campaign.stats || {
          totalRecipients: 0,
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          failed: 0,
        },
        // Don't include body in list view for security
        hasBody: !!campaign.body,
      }));
      
      return NextResponse.json({
        success: true,
        campaigns: sanitizedCampaigns,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
      
    } catch (error) {
      logger.error('CAMPAIGNS', 'Failed to fetch campaigns', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch campaigns' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.CAMPAIGNS_VIEW,
    resource: 'campaigns',
    action: 'list',
  }
);

// ============================================================================
// POST - Create campaign
// ============================================================================

export const POST = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    const admin = request.admin;
    
    try {
      const body = await request.json();
      
      // Validate with Zod
      const validation = validateBody(body, CampaignCreateSchema);
      
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: (validation as { success: false; error: string }).error },
          { status: 400 }
        );
      }
      
      const { name, subject, preheader, body: emailBody, segmentCriteria, scheduledFor } = validation.data;
      
      // Validate scheduled time is in the future
      let scheduledDate: Date | undefined;
      if (scheduledFor) {
        scheduledDate = new Date(scheduledFor);
        if (scheduledDate <= new Date()) {
          return NextResponse.json(
            { success: false, error: 'Scheduled time must be in the future' },
            { status: 400 }
          );
        }
        
        // Validate not too far in future (max 1 year)
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 1);
        if (scheduledDate > maxDate) {
          return NextResponse.json(
            { success: false, error: 'Scheduled time must be within 1 year' },
            { status: 400 }
          );
        }
      }
      
      // Sanitize HTML body to prevent XSS
      const sanitizedBody = sanitizeHtml(emailBody);
      
      const { db } = await connectToDatabase();
      
      // Generate campaign ID
      const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const campaign: Campaign = {
        id: campaignId,
        name,
        subject,
        preheader: preheader || '',
        body: sanitizedBody,
        segmentCriteria: segmentCriteria || {},
        status: scheduledDate ? 'scheduled' : 'draft',
        scheduledFor: scheduledDate,
        createdBy: admin.email,
        createdAt: new Date(),
        updatedAt: new Date(),
        stats: {
          totalRecipients: 0,
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          failed: 0,
        },
      };
      
      await db.collection('campaigns').insertOne(campaign);
      
      logger.info('CAMPAIGNS', `Campaign created by ${admin.email}`, {
        campaignId,
        name,
        status: campaign.status,
      });
      
      return NextResponse.json(
        {
          success: true,
          campaign: {
            id: campaign.id,
            name: campaign.name,
            subject: campaign.subject,
            status: campaign.status,
            scheduledFor: campaign.scheduledFor,
          },
        },
        { status: 201 }
      );
      
    } catch (error) {
      logger.error('CAMPAIGNS', 'Failed to create campaign', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create campaign' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.CAMPAIGNS_CREATE,
    resource: 'campaigns',
    action: 'create',
    rateLimit: { maxRequests: 30, windowSeconds: 60 },
  }
);

// ============================================================================
// PUT - Update campaign (draft only)
// ============================================================================

export const PUT = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    const admin = request.admin;
    
    try {
      const body = await request.json();
      const { campaignId, updates } = body;
      
      if (!campaignId || typeof campaignId !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Campaign ID is required' },
          { status: 400 }
        );
      }
      
      const { db } = await connectToDatabase();
      
      // Find campaign
      const campaign = await db.collection('campaigns').findOne({ id: campaignId }) as Campaign | null;
      
      if (!campaign) {
        return NextResponse.json(
          { success: false, error: 'Campaign not found' },
          { status: 404 }
        );
      }
      
      // Only allow updates to draft campaigns
      if (campaign.status !== 'draft') {
        return NextResponse.json(
          { success: false, error: 'Can only update draft campaigns' },
          { status: 400 }
        );
      }
      
      // Whitelist allowed update fields
      const allowedFields = ['name', 'subject', 'preheader', 'body', 'segmentCriteria', 'scheduledFor'];
      const updateData: Record<string, unknown> = {};
      
      for (const field of allowedFields) {
        if (field in updates) {
          if (field === 'body') {
            // Sanitize HTML
            updateData[field] = sanitizeHtml(updates[field]);
          } else if (field === 'scheduledFor') {
            const scheduledDate = new Date(updates[field]);
            if (scheduledDate <= new Date()) {
              return NextResponse.json(
                { success: false, error: 'Scheduled time must be in the future' },
                { status: 400 }
              );
            }
            updateData[field] = scheduledDate;
            updateData.status = 'scheduled';
          } else {
            updateData[field] = updates[field];
          }
        }
      }
      
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { success: false, error: 'No valid fields to update' },
          { status: 400 }
        );
      }
      
      updateData.updatedAt = new Date();
      
      await db.collection('campaigns').updateOne(
        { id: campaignId },
        { $set: updateData }
      );
      
      logger.info('CAMPAIGNS', `Campaign ${campaignId} updated by ${admin.email}`, {
        fields: Object.keys(updateData),
      });
      
      return NextResponse.json({
        success: true,
        message: 'Campaign updated successfully',
      });
      
    } catch (error) {
      logger.error('CAMPAIGNS', 'Failed to update campaign', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update campaign' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.CAMPAIGNS_CREATE,
    resource: 'campaigns',
    action: 'update',
    rateLimit: { maxRequests: 30, windowSeconds: 60 },
  }
);

// ============================================================================
// DELETE - Delete campaign
// ============================================================================

export const DELETE = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    const admin = request.admin;
    
    try {
      const { searchParams } = new URL(request.url);
      const campaignId = searchParams.get('id');
      
      if (!campaignId) {
        return NextResponse.json(
          { success: false, error: 'Campaign ID is required' },
          { status: 400 }
        );
      }
      
      const { db } = await connectToDatabase();
      
      // Find campaign
      const campaign = await db.collection('campaigns').findOne({ id: campaignId }) as Campaign | null;
      
      if (!campaign) {
        return NextResponse.json(
          { success: false, error: 'Campaign not found' },
          { status: 404 }
        );
      }
      
      // Don't allow deleting sending campaigns
      if (campaign.status === 'sending') {
        return NextResponse.json(
          { success: false, error: 'Cannot delete campaign while sending' },
          { status: 400 }
        );
      }
      
      // Archive before delete
      await db.collection('deleted_campaigns').insertOne({
        campaignId,
        campaignData: campaign,
        deletedBy: admin.email,
        deletedAt: new Date(),
      });
      
      // Delete campaign
      await db.collection('campaigns').deleteOne({ id: campaignId });
      
      logger.info('CAMPAIGNS', `Campaign ${campaignId} deleted by ${admin.email}`);
      
      return NextResponse.json({
        success: true,
        message: 'Campaign deleted successfully',
      });
      
    } catch (error) {
      logger.error('CAMPAIGNS', 'Failed to delete campaign', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete campaign' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.CAMPAIGNS_DELETE,
    resource: 'campaigns',
    action: 'delete',
    rateLimit: { maxRequests: 20, windowSeconds: 60 },
  }
);
