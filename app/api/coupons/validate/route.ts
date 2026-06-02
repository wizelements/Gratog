export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';

export async function POST(request: NextRequest) {
  try {
    const { code, cartTotal } = await request.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ success: false, error: 'Coupon code is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const coupon = await db.collection('coupons').findOne({
      code: code.toUpperCase().trim(),
      isActive: { $ne: false },
    });

    if (!coupon) {
      return NextResponse.json({ success: false, error: 'Invalid coupon code' }, { status: 404 });
    }

    // Check expiration
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json({ success: false, error: 'Coupon has expired' }, { status: 400 });
    }

    // Check usage limit
    if (coupon.maxUses && coupon.timesUsed >= coupon.maxUses) {
      return NextResponse.json({ success: false, error: 'Coupon usage limit reached' }, { status: 400 });
    }

    // Check minimum order
    if (coupon.minimumOrder && cartTotal && cartTotal < coupon.minimumOrder) {
      return NextResponse.json({ success: false, error: `Minimum order of $${coupon.minimumOrder} required` }, { status: 400 });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = cartTotal ? (cartTotal * (coupon.value / 100)) : coupon.value;
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else {
      discount = coupon.value || 0;
    }

    return NextResponse.json({
      success: true,
      coupon: {
        code: coupon.code,
        type: coupon.type || 'fixed',
        value: coupon.value,
        discount: Math.round(discount * 100) / 100,
        description: coupon.description || '',
      },
    });
  } catch (error) {
    console.error('Coupon validation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to validate coupon' }, { status: 500 });
  }
}
