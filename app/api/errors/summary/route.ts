/**
 * Error Summary API Endpoint
 * 
 * GET /api/errors/summary - Returns comprehensive error analysis
 * 
 * Requires authentication (admin or API key)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { generateErrorSummary, getStoredErrors, clearErrorStore } from '@/lib/error-tracker';

export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin(request);

    const action = request.nextUrl.searchParams.get('action');

    if (action === 'clear') {
      clearErrorStore();
      return NextResponse.json({
        success: true,
        message: 'Error store cleared',
      });
    }

    // Generate comprehensive summary
    const summary = generateErrorSummary();

    return NextResponse.json(
      {
        success: true,
        summary: {
          id: summary.id,
          timestamp: summary.timestamp,
          errorCount: summary.errorCount,
          firstOccurrence: summary.firstOccurrence,
          lastOccurrence: summary.lastOccurrence,
          sources: Array.from(summary.sources),
          categories: Array.from(summary.categories),
          patterns: summary.patterns,
          topErrors: summary.topErrors,
          timeline: summary.timeline,
          correlations: summary.correlations,
          recommendations: summary.recommendations,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return NextResponse.json(
      { success: false, error: message },
      { status: error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 401 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin(request);

    const { action } = await request.json();

    if (action === 'clear') {
      clearErrorStore();
      return NextResponse.json({
        success: true,
        message: 'Error store cleared',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return NextResponse.json(
      { success: false, error: message },
      { status: error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 401 }
    );
  }
}
