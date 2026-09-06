import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { findUserById } from '@/lib/db/users';
import { listMarketOrdersForUser } from '@/lib/repositories/order-reads';

export const dynamic = 'force-dynamic';

async function getAuthUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = await verifyToken(token);
  if (typeof decoded?.userId !== 'string' || !decoded.userId) return null;
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

    const mapped = await listMarketOrdersForUser(
      String(decoded.userId),
      typeof user.email === 'string' ? user.email : '',
    );

    return NextResponse.json({ success: true, orders: mapped });
  } catch (error) {
    console.error('Orders fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}
