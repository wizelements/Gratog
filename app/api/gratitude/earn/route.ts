import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { earnFromPurchase, earnFromActivity } from '@/lib/gratitude/transactions';

export const runtime = 'nodejs';

/**
 * POST /api/gratitude/earn
 * Award credits to a customer (internal use, authenticated)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId,
      type, // 'purchase', 'review', 'referral', 'birthday', 'social_share', etc.
      // For purchases
      orderId,
      orderTotal,
      tier,
      isFirstPurchase,
      isPreorder,
      // For activities
      credits,
      description,
      metadata
    } = body;
    
    if (!customerId || !type) {
      return NextResponse.json(
        { error: 'customerId and type required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    let result;
    
    if (type === 'purchase') {
      // Validate purchase params
      if (!orderId || !orderTotal) {
        return NextResponse.json(
          { error: 'orderId and orderTotal required for purchase type' },
          { status: 400 }
        );
      }
      
      result = await earnFromPurchase({
        customerId,
        orderId,
        orderTotal,
        tier: tier || 'seedling',
        isFirstPurchase: isFirstPurchase || false,
        isPreorder: isPreorder || false,
        metadata
      });
      
    } else {
      // Activity-based earning
      if (!credits || !description) {
        return NextResponse.json(
          { error: 'credits and description required for activity type' },
          { status: 400 }
        );
      }
      
      result = await earnFromActivity({
        customerId,
        activityType: type,
        credits,
        description,
        metadata
      });
    }
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || result.errors?.join(', ') },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      credits: result.credits,
      transaction: result.transaction,
      tierUpgrade: result.tierUpgrade || null
    });
    
  } catch (error) {
    console.error('Gratitude earn error:', error);
    return NextResponse.json(
      { error: 'Failed to award credits' },
      { status: 500 }
    );
  }
}
