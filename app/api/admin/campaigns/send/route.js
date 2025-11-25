import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { sendCampaign } from '@/lib/campaign-manager';

/**
 * POST /api/admin/campaigns/send - Send campaign to recipients
 */
export async function POST(request) {
  try {
    await requireAdmin(request);
    
    const body = await request.json();
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    const result = await sendCampaign(campaignId);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Send campaign error:', error);
    
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to send campaign' },
      { status: 500 }
    );
  }
}
