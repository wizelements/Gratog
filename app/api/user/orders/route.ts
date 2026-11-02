import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { findUserById } from '@/lib/db/users';
import { connectToDatabase } from '@/lib/db-optimized';
import {openTursoPreview,tursoPreviewSelected} from '@/lib/checkout/turso-preview-runtime.mjs';
import {listTursoCustomerOrders} from '@/lib/auth/turso-customer-accounts.mjs';

export const dynamic = 'force-dynamic';

async function getAuthUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = await verifyToken(token);
  if (!decoded?.userId) return null;
  return decoded;
}

export async function GET(request: NextRequest) {
  try {
    const decoded = await getAuthUser(request);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await findUserById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if(tursoPreviewSelected())return NextResponse.json({success:true,orders:await listTursoCustomerOrders(await openTursoPreview(),decoded.userId)});

    const { db } = await connectToDatabase();
    const orders = await db.collection('marketorders').find({
      userId: decoded.userId,
    }).sort({ createdAt: -1 }).limit(50).toArray();

    const mapped = orders.map((order: any) => ({
      id: order._id?.toString() || order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      items: order.items || [],
      total: order.total,
      fulfillment: order.fulfillment || null,
      createdAt: order.createdAt,
    }));

    return NextResponse.json({ success: true, orders: mapped });
  } catch (error: any) {
    if(error?.name==='TursoCustomerRefusal')return NextResponse.json({success:false,error:error.message},{status:error.status});
    console.error('Orders fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}
