import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { sendCampaign } from '@/lib/campaign-manager';
import { logger } from '@/lib/logger';

const DEBUG = process.env.DEBUG === 'true' || process.env.VERBOSE === 'true';
const debug = (...args) => { if (DEBUG) console.log('[CampaignCron]', ...args); };

const CRON_SECRET = process.env.CRON_SECRET;

// Limit campaigns per run to respect Vercel's 30s timeout
// At 10 emails/sec, ~200 emails = 20s, leaving buffer
const MAX_CAMPAIGNS_PER_RUN = 3;

/**
 * POST /api/cron/scheduled-campaigns
 * Process scheduled campaigns that are due for sending
 * 
 * Called by Vercel Cron every 5 minutes
 */
export async function POST(request) {
  const startTime = Date.now();
  
  try {
    // Auth: support both external cron (Authorization) and Vercel cron
    const authHeader = request.headers.get('Authorization');
    const isVercelCron = !!request.headers.get('x-vercel-cron');

    if (!isVercelCron) {
      if (!CRON_SECRET) {
        logger.error('CampaignCron', 'CRON_SECRET not configured');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
      }
      if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
        logger.warn('CampaignCron', 'Unauthorized cron attempt');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    debug('📅 Scheduled campaigns cron started');
    logger.info('CampaignCron', 'Processing scheduled campaigns');

    const { db } = await connectToDatabase();
    const now = new Date();

    const processed = [];
    const failures = [];

    // Process up to MAX_CAMPAIGNS_PER_RUN campaigns
    for (let i = 0; i < MAX_CAMPAIGNS_PER_RUN; i++) {
      // Atomically claim a scheduled campaign using findOneAndUpdate
      // This prevents race conditions if cron runs twice
      const claimResult = await db.collection('campaigns').findOneAndUpdate(
        {
          status: 'scheduled',
          scheduledFor: { $lte: now }
        },
        {
          $set: {
            status: 'processing',
            lastAttemptAt: now,
            updatedAt: now
          },
          $inc: { retryCount: 1 }
        },
        {
          sort: { scheduledFor: 1 }, // Oldest first (FIFO)
          returnDocument: 'after'
        }
      );

      const campaign = claimResult?.value || claimResult;
      if (!campaign || !campaign.id) {
        debug('No more scheduled campaigns due');
        break;
      }

      debug(`📨 Claimed campaign ${campaign.id} (${campaign.name}) for processing`);
      logger.info('CampaignCron', `Processing campaign: ${campaign.name}`, { 
        campaignId: campaign.id,
        scheduledFor: campaign.scheduledFor 
      });

      try {
        // Delegate to existing sendCampaign logic
        const result = await sendCampaign(campaign.id);

        processed.push({
          id: campaign.id,
          name: campaign.name,
          recipients: result.totalRecipients || 0,
          result: 'queued'
        });

        debug(`✅ Campaign ${campaign.id} processing started`);
        logger.info('CampaignCron', `Campaign ${campaign.name} queued for sending`, {
          campaignId: campaign.id,
          recipients: result.totalRecipients
        });

      } catch (err) {
        console.error(`❌ Error sending campaign ${campaign.id}:`, err);
        logger.error('CampaignCron', `Campaign ${campaign.name} failed`, {
          campaignId: campaign.id,
          error: err.message
        });

        // Mark campaign as failed
        await db.collection('campaigns').updateOne(
          { id: campaign.id },
          {
            $set: {
              status: 'failed',
              lastError: err.message || 'Unknown error in cron',
              updatedAt: new Date()
            }
          }
        );

        failures.push({
          id: campaign.id,
          name: campaign.name,
          error: err.message || String(err)
        });
      }
    }

    // Also check for stuck campaigns (processing > 15 minutes)
    const stuckThreshold = new Date(now.getTime() - 15 * 60 * 1000);
    const stuckCampaigns = await db.collection('campaigns').updateMany(
      {
        status: 'processing',
        lastAttemptAt: { $lt: stuckThreshold }
      },
      {
        $set: {
          status: 'failed',
          lastError: 'Stuck in processing state - timed out',
          updatedAt: now
        }
      }
    );

    if (stuckCampaigns.modifiedCount > 0) {
      logger.warn('CampaignCron', `Reset ${stuckCampaigns.modifiedCount} stuck campaigns`);
    }

    const duration = Date.now() - startTime;
    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      durationMs: duration,
      processedCount: processed.length,
      failedCount: failures.length,
      stuckReset: stuckCampaigns.modifiedCount || 0,
      processed,
      failed: failures
    };

    debug('📊 Scheduled campaigns cron completed:', summary);
    logger.info('CampaignCron', 'Cron completed', { 
      processed: processed.length, 
      failed: failures.length,
      durationMs: duration 
    });

    return NextResponse.json(summary);

  } catch (error) {
    console.error('❌ Scheduled campaigns cron error:', error);
    logger.error('CampaignCron', 'Cron job failed', { error: error.message });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process scheduled campaigns',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * GET /api/cron/scheduled-campaigns
 * Health check and status endpoint
 */
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    
    // Get counts for dashboard
    const [scheduled, processing, sent, failed] = await Promise.all([
      db.collection('campaigns').countDocuments({ status: 'scheduled' }),
      db.collection('campaigns').countDocuments({ status: 'processing' }),
      db.collection('campaigns').countDocuments({ status: 'sent' }),
      db.collection('campaigns').countDocuments({ status: 'failed' })
    ]);

    // Get next scheduled campaign
    const nextCampaign = await db.collection('campaigns')
      .findOne(
        { status: 'scheduled', scheduledFor: { $exists: true } },
        { sort: { scheduledFor: 1 }, projection: { name: 1, scheduledFor: 1 } }
      );

    return NextResponse.json({
      service: 'Scheduled Campaigns Processor',
      status: 'active',
      schedule: 'Every 5 minutes',
      endpoint: '/api/cron/scheduled-campaigns',
      method: 'POST',
      authentication: 'Vercel Cron or Bearer token',
      stats: {
        scheduled,
        processing,
        sent,
        failed
      },
      nextScheduled: nextCampaign ? {
        name: nextCampaign.name,
        scheduledFor: nextCampaign.scheduledFor
      } : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      service: 'Scheduled Campaigns Processor',
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
