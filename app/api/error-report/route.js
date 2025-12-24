import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Client-Side Error Report API
 * Receives errors from error boundaries and stores them for debugging
 */

// In-memory store for client errors (in production, use Redis or database)
const MAX_ERRORS = 100;
const clientErrors = [];

export async function POST(request) {
  try {
    const body = await request.json();
    
    const errorReport = {
      id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      receivedAt: new Date().toISOString(),
      message: body.message || 'Unknown error',
      name: body.name || 'Error',
      stack: body.stack || null,
      url: body.url || null,
      userAgent: body.userAgent || null,
      timestamp: body.timestamp || new Date().toISOString(),
      digest: body.digest || null,
      source: body.source || 'ErrorBoundary',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    };

    // Log it
    const errorLogger = logger.withCategory('CLIENT_ERROR');
    errorLogger.error(`[${errorReport.id}] ${errorReport.message}`, {
      url: errorReport.url,
      source: errorReport.source,
      digest: errorReport.digest,
    });

    // Store in memory (FIFO)
    clientErrors.unshift(errorReport);
    if (clientErrors.length > MAX_ERRORS) {
      clientErrors.pop();
    }

    // Also log to console for Vercel logs
    console.error('[CLIENT_ERROR_REPORT]', JSON.stringify(errorReport, null, 2));

    return NextResponse.json({ 
      success: true, 
      errorId: errorReport.id,
      message: 'Error reported successfully'
    });
  } catch (error) {
    console.error('Failed to process error report:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process error report' 
    }, { status: 500 });
  }
}

export async function GET(request) {
  // Simple auth check - require admin token
  const authHeader = request.headers.get('authorization');
  const adminToken = process.env.ADMIN_SECRET || 'admin123';
  
  if (authHeader !== `Bearer ${adminToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    count: clientErrors.length,
    errors: clientErrors.slice(0, 50), // Return last 50
  });
}
