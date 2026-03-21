import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { getAuditLogs } from '@/lib/admin-auth-middleware';
import { logger } from '@/lib/logger';

export async function GET(request) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    
    const filters = {};
    
    if (searchParams.get('userId')) {
      filters.userId = searchParams.get('userId');
    }
    
    if (searchParams.get('email')) {
      filters.email = searchParams.get('email');
    }
    
    if (searchParams.get('action')) {
      filters.action = searchParams.get('action');
    }
    
    if (searchParams.get('startDate')) {
      filters.startDate = searchParams.get('startDate');
    }
    
    if (searchParams.get('endDate')) {
      filters.endDate = searchParams.get('endDate');
    }
    
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    
    const result = await getAuditLogs(filters, limit, skip);
    
    return NextResponse.json(result);
  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('API', 'Error fetching audit logs', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
