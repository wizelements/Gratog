import { NextResponse } from 'next/server';
import { Client, Environment } from 'square';
import { randomUUID } from 'crypto';
import { connectToDatabase } from '@/lib/db-admin';

// Initialize Square client
const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.NODE_ENV === 'production' 
    ? Environment.Production 
    : Environment.Sandbox
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      customerEmail, 
      discountAmount, 
      freeShipping = false, 
      type = 'spin_wheel',
      source = 'manual'
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

    let squareDiscountId = null;
    let squareDiscount = null;

    // Create discount in Square (if not in mock mode)
    const hasValidSquareToken = process.env.SQUARE_ACCESS_TOKEN?.startsWith('sandbox-sq0atb') || 
                                process.env.SQUARE_ACCESS_TOKEN?.startsWith('sq0atb');

    if (hasValidSquareToken && (discountAmount > 0 || freeShipping)) {
      try {
        const discountRequest = {
          idempotencyKey: randomUUID(),
          discount: {
            name: `Spin Wheel - ${couponCode}`,
            discountType: discountAmount > 0 ? 'FIXED_AMOUNT' : 'VARIABLE_PERCENTAGE',
            ...(discountAmount > 0 && {
              amountMoney: {
                amount: discountAmount,
                currency: 'USD'
              }
            }),
            ...(freeShipping && !discountAmount && {
              percentage: '0' // Free shipping handled separately
            })
          }
        };

        const { result } = await squareClient.catalogApi.upsertCatalogObject(discountRequest);
        squareDiscountId = result.catalogObject?.id;
        squareDiscount = result.catalogObject;
        
        console.log('Square discount created:', squareDiscountId);
      } catch (squareError) {
        console.error('Square discount creation failed:', squareError);
        // Continue without Square integration in case of errors
      }
    }

    // Save coupon to database
    const { db } = await connectToDatabase();
    
    const couponData = {
      id: randomUUID(),
      code: couponCode,
      customerEmail,
      discountAmount,
      freeShipping,
      type,
      source,
      squareDiscountId,
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
      squareId: squareDiscountId
    });

    return NextResponse.json({
      success: true,
      coupon: {
        id: couponData.id,
        code: couponCode,
        discountAmount,
        freeShipping,
        expiresAt: expiryDate.toISOString(),
        squareDiscountId
      },
      message: 'Coupon created successfully'
    });

  } catch (error) {
    console.error('Coupon creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create coupon' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve active coupons for a customer
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Get active, unused coupons for the customer
    const coupons = await db.collection('coupons')
      .find({
        customerEmail: email,
        isUsed: false,
        expiresAt: { $gt: new Date().toISOString() }
      })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      coupons: coupons.map(coupon => ({
        id: coupon.id,
        code: coupon.code,
        discountAmount: coupon.discountAmount,
        freeShipping: coupon.freeShipping,
        type: coupon.type,
        createdAt: coupon.createdAt,
        expiresAt: coupon.expiresAt
      }))
    });

  } catch (error) {
    console.error('Error fetching coupons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
}