import { NextResponse } from 'next/server';
import { getOrders } from '@/lib/db-admin';
import { verifyToken } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(request) {
  try {
    // Admin only
    const token = request.cookies.get('admin_token')?.value;
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const result = await getOrders();
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ orders: result.orders });
  } catch (error) {
    logger.error('API', 'Get orders error', error);
    return NextResponse.json(
      { error: 'Failed to get orders' },
      { status: 500 }
    );
  }
}
