import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSalesAnalytics } from '@/lib/admin-analytics';

/**
 * GET /api/admin/analytics/sales - Sales analytics
 */
export async function GET(request) {
  try {
    await requireAdmin(request);
    
    const analytics = await getSalesAnalytics();

    return NextResponse.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Sales analytics error:', error);
    
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch sales analytics' },
      { status: 500 }
    );
  }
}
