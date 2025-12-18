import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { sendCampaign } from '@/lib/campaign-manager';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/campaigns/send - Send campaign to recipients
 */
export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    
    const body = await request.json();
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    logger.info('API', `Campaign ${campaignId} send initiated by ${admin.email}`);

    const result = await sendCampaign(campaignId);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('API', 'Send campaign error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send campaign' },
      { status: 500 }
    );
  }
}
