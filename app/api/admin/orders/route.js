import { NextResponse } from 'next/server';
import { getOrders } from '@/lib/db-admin';
import { verifyToken } from '@/lib/auth';

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
    
    const orders = await getOrders();
    const orderList = await orders.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    
    return NextResponse.json({ orders: orderList });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json(
      { error: 'Failed to get orders' },
      { status: 500 }
    );
  }
}
