/**
 * Error List API Endpoint
 * 
 * GET /api/errors/list - Returns stored error details
 * 
 * Query parameters:
 * - limit: Number of errors to return (default: 50)
 * - offset: Skip N errors (default: 0)
 * - source: Filter by source (client|server|api|hydration)
 * - category: Filter by category
 * - severity: Filter by severity (critical|high|medium|low)
 * 
 * Requires authentication (admin or API key)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { getStoredErrors } from '@/lib/error-tracker';

export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin(request);

    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get('limit') || '50'),
      100
    );
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');
    const sourceFilter = request.nextUrl.searchParams.get('source');
    const categoryFilter = request.nextUrl.searchParams.get('category');
    const severityFilter = request.nextUrl.searchParams.get('severity');

    let errors = getStoredErrors();

    // Apply filters
    if (sourceFilter) {
      errors = errors.filter(e => e.source === sourceFilter);
    }
    if (categoryFilter) {
      errors = errors.filter(e => e.category === categoryFilter);
    }
    if (severityFilter) {
      errors = errors.filter(e => e.severity === severityFilter);
    }

    // Sort by timestamp descending (newest first)
    errors.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const total = errors.length;
    const paginated = errors.slice(offset, offset + limit);

    return NextResponse.json(
      {
        success: true,
        data: {
          total,
          limit,
          offset,
          errors: paginated.map(e => ({
            timestamp: e.timestamp,
            message: e.message,
            source: e.source,
            category: e.category,
            severity: e.severity,
            component: e.component,
            endpoint: e.endpoint,
            memory: e.memory,
            metadata: e.metadata,
            // Stack trace only in development
            ...(process.env.NODE_ENV === 'development' && { stack: e.stack }),
          })),
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
