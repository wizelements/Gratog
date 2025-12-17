import { NextResponse } from 'next/server';
import { getQuizAnalytics } from '@/lib/db-quiz';

/**
 * GET /api/quiz/analytics
 * Get quiz analytics for admin dashboard
 * Query params: days (default: 30)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    
    const result = await getQuizAnalytics(days);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      analytics: result.data,
      period: `${days} days`
    });
    
  } catch (error) {
    console.error('Quiz analytics error:', { error: error.message, stack: error.stack });
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve analytics' },
      { status: 500 }
    );
  }
}
