import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/campaigns/[id] - Get single campaign with analytics
 */
export async function GET(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const { db } = await connectToDatabase();

    const campaign = await db.collection('campaigns').findOne({ id });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get send statistics
    const sends = await db.collection('email_sends').find({ campaignId: id }).toArray();
    
    const analytics = {
      totalSends: sends.length,
      sent: sends.filter(s => s.status === 'sent').length,
      failed: sends.filter(s => s.status === 'failed').length,
      skipped: sends.filter(s => s.status === 'skipped').length,
      delivered: campaign.stats?.delivered || 0,
      opened: campaign.stats?.opened || 0,
      clicked: campaign.stats?.clicked || 0
    };

    return NextResponse.json({
      success: true,
      campaign,
      analytics,
      sends: sends.slice(0, 100) // Limit for performance
    });

  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    logger.error('API', 'Get campaign error:', error);
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/campaigns/[id] - Update campaign or change status
 * 
 * Actions:
 * - { action: 'retry' } - Reset failed campaign to scheduled for retry
 * - { action: 'cancel' } - Cancel a scheduled campaign
 * - { action: 'reschedule', scheduledFor: '...' } - Reschedule campaign
 * - { ...fields } - Update campaign fields (name, subject, body, etc.)
 */
export async function PATCH(request, { params }) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();

    const { db } = await connectToDatabase();

    const campaign = await db.collection('campaigns').findOne({ id });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const { action, scheduledFor, ...updates } = body;

    // Handle special actions
    if (action === 'retry') {
      // Retry a failed campaign
      if (campaign.status !== 'failed') {
        return NextResponse.json({ 
          error: 'Only failed campaigns can be retried' 
        }, { status: 400 });
      }

      await db.collection('campaigns').updateOne(
        { id },
        {
          $set: {
            status: 'scheduled',
            scheduledFor: new Date(), // Schedule immediately
            lastError: null,
            updatedAt: new Date()
          }
        }
      );

      logger.info('API', `Campaign ${id} retried by ${admin.email}`);
      return NextResponse.json({ 
        success: true, 
        message: 'Campaign scheduled for retry',
        newStatus: 'scheduled'
      });
    }

    if (action === 'cancel') {
      // Cancel a scheduled or processing campaign
      if (!['scheduled', 'processing', 'draft'].includes(campaign.status)) {
        return NextResponse.json({ 
          error: 'Only scheduled, processing, or draft campaigns can be cancelled' 
        }, { status: 400 });
      }

      await db.collection('campaigns').updateOne(
        { id },
        {
          $set: {
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelledBy: admin.id,
            updatedAt: new Date()
          }
        }
      );

      logger.info('API', `Campaign ${id} cancelled by ${admin.email}`);
      return NextResponse.json({ 
        success: true, 
        message: 'Campaign cancelled',
        newStatus: 'cancelled'
      });
    }

    if (action === 'reschedule') {
      if (!scheduledFor) {
        return NextResponse.json({ 
          error: 'scheduledFor is required for reschedule action' 
        }, { status: 400 });
      }

      if (!['failed', 'draft', 'scheduled', 'cancelled'].includes(campaign.status)) {
        return NextResponse.json({ 
          error: 'Cannot reschedule a campaign that is sending or already sent' 
        }, { status: 400 });
      }

      await db.collection('campaigns').updateOne(
        { id },
        {
          $set: {
            status: 'scheduled',
            scheduledFor: new Date(scheduledFor),
            lastError: null,
            updatedAt: new Date()
          }
        }
      );

      logger.info('API', `Campaign ${id} rescheduled to ${scheduledFor} by ${admin.email}`);
      return NextResponse.json({ 
        success: true, 
        message: 'Campaign rescheduled',
        newStatus: 'scheduled',
        scheduledFor: new Date(scheduledFor)
      });
    }

    if (action === 'reset-stuck') {
      // Reset a stuck processing campaign
      if (campaign.status !== 'processing') {
        return NextResponse.json({ 
          error: 'Only processing campaigns can be reset' 
        }, { status: 400 });
      }

      await db.collection('campaigns').updateOne(
        { id },
        {
          $set: {
            status: 'failed',
            lastError: 'Manually reset by admin',
            updatedAt: new Date()
          }
        }
      );

      logger.info('API', `Campaign ${id} reset from stuck state by ${admin.email}`);
      return NextResponse.json({ 
        success: true, 
        message: 'Campaign reset to failed state',
        newStatus: 'failed'
      });
    }

    // Standard field updates (only for draft/scheduled campaigns)
    if (Object.keys(updates).length > 0) {
      if (!['draft', 'scheduled'].includes(campaign.status)) {
        return NextResponse.json({ 
          error: 'Cannot edit a campaign that is sending, sent, or failed' 
        }, { status: 400 });
      }

      // Only allow certain fields to be updated
      const allowedFields = ['name', 'subject', 'preheader', 'body', 'segmentCriteria'];
      const filteredUpdates = {};
      for (const key of allowedFields) {
        if (updates[key] !== undefined) {
          filteredUpdates[key] = updates[key];
        }
      }

      if (Object.keys(filteredUpdates).length > 0) {
        await db.collection('campaigns').updateOne(
          { id },
          {
            $set: {
              ...filteredUpdates,
              updatedAt: new Date()
            }
          }
        );

        logger.info('API', `Campaign ${id} updated by ${admin.email}`);
        return NextResponse.json({ 
          success: true, 
          message: 'Campaign updated',
          updated: Object.keys(filteredUpdates)
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'No changes made' 
    });

  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    logger.error('API', 'Update campaign error:', error);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/campaigns/[id] - Delete a campaign
 */
export async function DELETE(request, { params }) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;

    const { db } = await connectToDatabase();

    const campaign = await db.collection('campaigns').findOne({ id });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Don't allow deleting sent campaigns (for audit trail)
    if (campaign.status === 'sent') {
      return NextResponse.json({ 
        error: 'Cannot delete sent campaigns - they are kept for analytics' 
      }, { status: 400 });
    }

    // Delete the campaign and associated sends
    await db.collection('campaigns').deleteOne({ id });
    const deletedSends = await db.collection('email_sends').deleteMany({ campaignId: id });

    logger.info('API', `Campaign ${id} deleted by ${admin.email}`, {
      deletedSends: deletedSends.deletedCount
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Campaign deleted',
      deletedSends: deletedSends.deletedCount
    });

  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    logger.error('API', 'Delete campaign error:', error);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}
