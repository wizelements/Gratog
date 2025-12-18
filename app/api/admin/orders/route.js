import { NextResponse } from 'next/server';
import { getOrders } from '@/lib/db-admin';
import { requireAdmin } from '@/lib/admin-session';
import { logger } from '@/lib/logger';

export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    
    const result = await getOrders();
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ orders: result.orders });
  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('API', 'Get orders error', error);
    return NextResponse.json(
      { error: 'Failed to get orders' },
      { status: 500 }
    );
  }
}
