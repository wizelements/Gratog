import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getCampaignAnalytics } from '@/lib/admin-analytics';

/**
 * GET /api/admin/analytics/campaigns - Campaign analytics
 */
export async function GET(request) {
  try {
    await requireAdmin(request);
    
    const analytics = await getCampaignAnalytics();

    return NextResponse.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Campaign analytics error:', error);
    
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch campaign analytics' },
      { status: 500 }
    );
  }
}
