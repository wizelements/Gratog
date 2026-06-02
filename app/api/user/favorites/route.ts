import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { findUserById } from '@/lib/db/users';
import { connectToDatabase } from '@/lib/db-optimized';

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

    const { db } = await connectToDatabase();
    const orders = await db.collection('marketorders').find({
      $or: [{ userId: decoded.userId }, { customerEmail: user.email }],
    }).toArray();

    const itemCounts: Record<string, any> = {};
    orders.forEach((order: any) => {
      (order.items || []).forEach((item: any) => {
        const key = item.productId || item.name;
        if (!key) return;
        if (!itemCounts[key]) {
          itemCounts[key] = {
            productId: item.productId,
            name: item.name,
            image: item.image,
            price: item.price,
            slug: item.slug,
            totalOrdered: 0,
          };
        }
        itemCounts[key].totalOrdered += (item.quantity || 1);
      });
    });

    const favorites = Object.values(itemCounts)
      .sort((a: any, b: any) => b.totalOrdered - a.totalOrdered)
      .slice(0, 10);

    return NextResponse.json({ success: true, favorites });
  } catch (error) {
    console.error('Favorites fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch favorites' }, { status: 500 });
  }
}
