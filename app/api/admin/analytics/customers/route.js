import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getCustomerAnalytics } from '@/lib/admin-analytics';

/**
 * GET /api/admin/analytics/customers - Customer analytics
 */
export async function GET(request) {
  try {
    await requireAdmin(request);
    
    const analytics = await getCustomerAnalytics();

    return NextResponse.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Customer analytics error:', error);
    
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch customer analytics' },
      { status: 500 }
    );
  }
}
