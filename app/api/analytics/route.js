import { NextResponse } from 'next/server';
import { getAnalyticsDashboard, trackEvent, initializeAnalytics } from '@/lib/unified-analytics';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics
 * Get analytics dashboard data
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = parseInt(searchParams.get('days') || '7');
    
    const dashboard = await getAnalyticsDashboard(dateRange);
    
    return NextResponse.json({
      success: true,
      dashboard
    });
  } catch (error) {
    console.error('❌ Analytics API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get analytics',
      message: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/analytics
 * Track analytics event
 */
export async function POST(request) {
  try {
    const { eventType, eventData, metadata } = await request.json();
    
    await trackEvent(eventType, eventData, metadata);
    
    return NextResponse.json({
      success: true,
      message: 'Event tracked'
    });
  } catch (error) {
    console.error('❌ Track Event API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to track event',
      message: error.message
    }, { status: 500 });
  }
}
