import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { getSalesAnalytics } from '@/lib/admin-analytics';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/analytics/sales - Sales analytics
 */
export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    
    const analytics = await getSalesAnalytics();

    return NextResponse.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('API', 'Sales analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales analytics' },
      { status: 500 }
    );
  }
}
