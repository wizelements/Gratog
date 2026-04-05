import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { PERMISSIONS } from '@/lib/security';
import { withAdminMiddleware, AuthenticatedRequest } from '@/lib/middleware/admin';
import { logger } from '@/lib/logger';
import { ObjectId } from 'mongodb';

// ============================================================================
// POST - Send campaign to recipients
// ============================================================================

interface Campaign {
  _id?: ObjectId;
  id: string;
  name: string;
  subject: string;
  preheader?: string;
  body: string;
  segmentCriteria: Record<string, unknown>;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  createdBy: string;
  stats?: {
    totalRecipients: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
  };
}

export const POST = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    const admin = request.admin;
    
    try {
      const body = await request.json();
      const { campaignId } = body;
      
      // Validate campaignId
      if (!campaignId || typeof campaignId !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Campaign ID is required' },
          { status: 400 }
        );
      }
      
      const { db } = await connectToDatabase();
      
      // Get campaign with transaction safety
      const campaign = await db.collection('campaigns').findOne(
        { id: campaignId }
      ) as Campaign | null;
      
      if (!campaign) {
        return NextResponse.json(
          { success: false, error: 'Campaign not found' },
          { status: 404 }
        );
      }
      
      // Validate campaign can be sent
      if (campaign.status === 'sent') {
        return NextResponse.json(
          { success: false, error: 'Campaign has already been sent' },
          { status: 400 }
        );
      }
      
      if (campaign.status === 'sending') {
        return NextResponse.json(
          { success: false, error: 'Campaign is already being sent' },
          { status: 400 }
        );
      }
      
      if (campaign.status === 'failed') {
        return NextResponse.json(
          { success: false, error: 'Campaign previously failed. Please create a new campaign.' },
          { status: 400 }
        );
      }
      
      // Update status to sending with atomic operation
      const updateResult = await db.collection('campaigns').updateOne(
        { 
          id: campaignId,
          status: { $in: ['draft', 'scheduled'] } // Only update if in valid state
        },
        { 
          $set: { 
            status: 'sending',
            sendingStartedAt: new Date(),
            sendingStartedBy: admin.email,
          }
        }
      );
      
      if (updateResult.matchedCount === 0) {
        return NextResponse.json(
          { success: false, error: 'Campaign state changed unexpectedly. Please retry.' },
          { status: 409 }
        );
      }
      
      // Build recipient list based on segment criteria
      let recipients: { email: string; name?: string }[] = [];
      
      try {
        recipients = await buildRecipientList(db, campaign.segmentCriteria);
      } catch (error) {
        // Rollback status on error
        await db.collection('campaigns').updateOne(
          { id: campaignId },
          { $set: { status: 'failed', failedAt: new Date(), failReason: 'Failed to build recipient list' } }
        );
        
        throw error;
      }
      
      // Validate recipient count
      if (recipients.length === 0) {
        // Rollback status
        await db.collection('campaigns').updateOne(
          { id: campaignId },
          { $set: { status: 'draft', rollbackReason: 'No recipients found' } }
        );
        
        return NextResponse.json(
          { success: false, error: 'No recipients match the segment criteria' },
          { status: 400 }
        );
      }
      
      // Limit check - prevent accidental mass emails
      const MAX_RECIPIENTS = 10000;
      if (recipients.length > MAX_RECIPIENTS) {
        // Rollback status
        await db.collection('campaigns').updateOne(
          { id: campaignId },
          { $set: { status: 'draft', rollbackReason: 'Recipient limit exceeded' } }
        );
        
        return NextResponse.json(
          { 
            success: false, 
            error: `Recipient count (${recipients.length}) exceeds maximum (${MAX_RECIPIENTS})`,
            code: 'RECIPIENT_LIMIT_EXCEEDED'
          },
          { status: 400 }
        );
      }
      
      // Store recipient count
      await db.collection('campaigns').updateOne(
        { id: campaignId },
        { 
          $set: { 
            'stats.totalRecipients': recipients.length,
            'stats.sent': 0,
            'stats.delivered': 0,
            'stats.opened': 0,
            'stats.clicked': 0,
            'stats.failed': 0,
          }
        }
      );
      
      // Queue emails for sending (async, don't wait)
      // In production, this should use a queue like Bull, SQS, etc.
      sendEmailsAsync(campaign, recipients, admin.email).catch(error => {
        logger.error('CAMPAIGN_SEND', 'Failed to send campaign emails', { campaignId, error });
        
        // Update status to failed
        db.collection('campaigns').updateOne(
          { id: campaignId },
          { $set: { status: 'failed', failedAt: new Date(), failReason: error.message } }
        );
      });
      
      logger.info('CAMPAIGNS', `Campaign ${campaignId} send initiated by ${admin.email}`, {
        recipientCount: recipients.length,
      });
      
      return NextResponse.json({
        success: true,
        message: 'Campaign send initiated',
        recipientCount: recipients.length,
        estimatedTime: `${Math.ceil(recipients.length / 100)} minutes`,
      });
      
    } catch (error) {
      logger.error('CAMPAIGNS', 'Failed to send campaign', error);
      return NextResponse.json(
        { success: false, error: 'Failed to send campaign' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.CAMPAIGNS_SEND,
    resource: 'campaigns',
    action: 'send',
    rateLimit: { maxRequests: 10, windowSeconds: 60 }, // Strict limit for sending
  }
);

// ============================================================================
// Helper: Build recipient list from segment criteria
// ============================================================================

async function buildRecipientList(
  db: any,
  criteria: Record<string, unknown>
): Promise<{ email: string; name?: string }[]> {
  const query: Record<string, unknown> = {};
  
  // Build query based on criteria
  if (criteria.purchaseFrequency) {
    // Would require aggregating orders
    // For now, simplified approach
    const { purchaseFrequency } = criteria as { purchaseFrequency: string };
    
    if (purchaseFrequency === 'first-time') {
      const orderCounts = await db.collection('orders').aggregate([
        { $group: { _id: '$customerEmail', count: { $sum: 1 } } },
        { $match: { count: 1 } },
      ]).toArray();
      
      return orderCounts.map((r: { _id: string }) => ({ email: r._id }));
    }
    
    if (purchaseFrequency === 'repeat') {
      const orderCounts = await db.collection('orders').aggregate([
        { $group: { _id: '$customerEmail', count: { $sum: 1 } } },
        { $match: { count: { $gte: 2, $lt: 5 } } },
      ]).toArray();
      
      return orderCounts.map((r: { _id: string }) => ({ email: r._id }));
    }
    
    if (purchaseFrequency === 'loyal') {
      const orderCounts = await db.collection('orders').aggregate([
        { $group: { _id: '$customerEmail', count: { $sum: 1 } } },
        { $match: { count: { $gte: 5 } } },
      ]).toArray();
      
      return orderCounts.map((r: { _id: string }) => ({ email: r._id }));
    }
  }
  
  if (criteria.rewardsTier) {
    const customers = await db.collection('customers')
      .find({ 'rewards.tier': criteria.rewardsTier })
      .project({ email: 1, name: 1 })
      .toArray();
    
    return customers.map((c: { email: string; name?: string }) => ({
      email: c.email,
      name: c.name,
    }));
  }
  
  if (criteria.inactive) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const activeEmails = await db.collection('orders')
      .distinct('customerEmail', {
        createdAt: { $gte: ninetyDaysAgo.toISOString() }
      });
    
    const allCustomers = await db.collection('customers')
      .find({ email: { $nin: activeEmails } })
      .project({ email: 1, name: 1 })
      .toArray();
    
    return allCustomers.map((c: { email: string; name?: string }) => ({
      email: c.email,
      name: c.name,
    }));
  }
  
  // Default: all customers who have opted in to marketing
  const customers = await db.collection('customers')
    .find({ 
      marketingConsent: true,
      unsubscribed: { $ne: true },
    })
    .project({ email: 1, name: 1 })
    .toArray();
  
  return customers.map((c: { email: string; name?: string }) => ({
    email: c.email,
    name: c.name,
  }));
}

// ============================================================================
// Helper: Send emails asynchronously
// ============================================================================

async function sendEmailsAsync(
  campaign: Campaign,
  recipients: { email: string; name?: string }[],
  senderEmail: string
): Promise<void> {
  const { db } = await connectToDatabase();
  
  // Import email service
  const { sendEmail } = await import('@/lib/email/service');
  
  const BATCH_SIZE = 100;
  let sentCount = 0;
  let failedCount = 0;
  
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    
    // Send batch
    const results = await Promise.allSettled(
      batch.map(async (recipient) => {
        try {
          const result = await sendEmail({
            to: recipient.email,
            subject: campaign.subject,
            html: campaign.body,
            text: campaign.body.replace(/<[^\u003e]*>/g, ''), // Strip HTML for text version
          });
          
          if (result.success) {
            sentCount++;
            return { success: true, email: recipient.email };
          } else {
            failedCount++;
            return { success: false, email: recipient.email, error: result.error };
          }
        } catch (error) {
          failedCount++;
          return { success: false, email: recipient.email, error: error instanceof Error ? error.message : 'Unknown' };
        }
      })
    );
    
    // Update progress
    await db.collection('campaigns').updateOne(
      { id: campaign.id },
      { 
        $set: { 
          'stats.sent': sentCount,
          'stats.failed': failedCount,
          lastBatchSent: new Date(),
        }
      }
    );
    
    // Rate limiting between batches
    if (i + BATCH_SIZE < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Final status update
  const finalStatus = failedCount === recipients.length ? 'failed' : 'sent';
  
  await db.collection('campaigns').updateOne(
    { id: campaign.id },
    { 
      $set: { 
        status: finalStatus,
        sentAt: new Date(),
        'stats.sent': sentCount,
        'stats.failed': failedCount,
        sentBy: senderEmail,
      }
    }
  );
  
  logger.info('CAMPAIGNS', `Campaign ${campaign.id} send completed`, {
    sent: sentCount,
    failed: failedCount,
    total: recipients.length,
  });
}
