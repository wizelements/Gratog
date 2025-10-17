import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { connectToDatabase } from '@/lib/db-optimized';

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      customerEmail, 
      discountAmount, 
      freeShipping = false, 
      type = 'spin_wheel',
      source = 'website',
      metadata = {}
    } = body;

    if (!customerEmail) {
      return NextResponse.json(
        { error: 'Customer email is required' },
        { status: 400 }
      );
    }

    // Generate unique coupon code
    const couponCode = `TOG${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    
    // Calculate expiry (24 hours from now)
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);

    // Save coupon to database (no Square SDK integration needed)
    const { db } = await connectToDatabase();
    
    const couponData = {
      id: randomUUID(),
      code: couponCode,
      customerEmail,
      discountAmount: discountAmount || 0,
      freeShipping,
      type,
      source,
      metadata,
      isUsed: false,
      createdAt: new Date().toISOString(),
      expiresAt: expiryDate.toISOString(),
      usedAt: null,
      orderId: null
    };

    await db.collection('coupons').insertOne(couponData);

    console.log('Coupon created:', {
      code: couponCode,
      email: customerEmail,
      amount: discountAmount,
      freeShipping,
      type
    });

    return NextResponse.json({
      success: true,
      coupon: {
        id: couponData.id,
        code: couponCode,
        discountAmount: discountAmount || 0,
        freeShipping,
        expiresAt: expiryDate.toISOString(),
        type,
        metadata
      },
      message: 'Coupon created successfully'
    });

  } catch (error) {
    console.error('Coupon creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create coupon', details: error.message },
      { status: 500 }
    );
  }
}
