import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { ResponseOptimizer, MemoryOptimizer } from '@/lib/response-optimizer';

export async function POST(request) {
  try {
    const body = await request.json();
    const { couponCode, customerEmail, orderTotal } = body;

    if (!couponCode) {
      return NextResponse.json(
        { error: 'Coupon code is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Find the coupon
    const coupon = await db.collection('coupons').findOne({
      code: couponCode.toUpperCase(),
      isUsed: false,
      expiresAt: { $gt: new Date().toISOString() }
    });

    if (!coupon) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or expired coupon code'
      });
    }

    // Check if coupon belongs to customer (optional check)
    if (customerEmail && coupon.customerEmail && 
        coupon.customerEmail.toLowerCase() !== customerEmail.toLowerCase()) {
      return NextResponse.json({
        valid: false,
        error: 'This coupon is not valid for your account'
      });
    }

    // Calculate discount
    let discountAmount = 0;
    let freeShipping = coupon.freeShipping || false;

    if (coupon.discountAmount > 0) {
      discountAmount = Math.min(coupon.discountAmount, orderTotal || 0);
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountAmount,
        freeShipping,
        type: coupon.type,
        expiresAt: coupon.expiresAt
      },
      discount: {
        amount: discountAmount,
        freeShipping,
        description: `${discountAmount > 0 ? `$${(discountAmount / 100).toFixed(2)} off` : ''}${freeShipping ? (discountAmount > 0 ? ' + ' : '') + 'Free shipping' : ''}`
      }
    });

  } catch (error) {
    console.error('Coupon validation error:', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: 'Failed to validate coupon' },
      { status: 500 }
    );
  }
}

// Mark coupon as used
export async function PUT(request) {
  try {
    const body = await request.json();
    const { couponCode, orderId } = body;

    if (!couponCode || !orderId) {
      return NextResponse.json(
        { error: 'Coupon code and order ID are required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    const result = await db.collection('coupons').updateOne(
      { 
        code: couponCode.toUpperCase(),
        isUsed: false 
      },
      {
        $set: {
          isUsed: true,
          usedAt: new Date().toISOString(),
          orderId
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Coupon not found or already used' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Coupon marked as used'
    });

  } catch (error) {
    console.error('Error marking coupon as used:', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: 'Failed to update coupon' },
      { status: 500 }
    );
  }
}