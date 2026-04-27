import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { processReferralConversion, creditReferrer } from '@/lib/gratitude/referrals';

export const runtime = 'nodejs';

/**
 * POST /api/gratitude/referral/track
 * Track a referral conversion
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    const body = await request.json();
    
    // Action: signup (new customer signs up with referral code)
    if (action === 'signup') {
      const { referralCode, newCustomerId, newCustomerEmail } = body;
      
      if (!referralCode || !newCustomerId) {
        return NextResponse.json(
          { error: 'referralCode and newCustomerId required' },
          { status: 400 }
        );
      }
      
      await connectToDatabase();
      
      const result = await processReferralConversion({
        referralCode,
        newCustomerId,
        newCustomerEmail
      });
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }
      
      return NextResponse.json({
        success: true,
        referral: result.referral
      });
    }
    
    // Action: purchase (referred customer makes first purchase)
    if (action === 'purchase') {
      const { newCustomerId, orderId } = body;
      
      if (!newCustomerId || !orderId) {
        return NextResponse.json(
          { error: 'newCustomerId and orderId required' },
          { status: 400 }
        );
      }
      
      await connectToDatabase();
      
      const result = await creditReferrer(newCustomerId, orderId);
      
      if (!result.success) {
        // This might be expected (already credited, etc.)
        return NextResponse.json(
          { error: result.error },
          { status: 200 } // Return 200 but indicate not credited
        );
      }
      
      return NextResponse.json({
        success: true,
        referrerCredited: true,
        credits: result.credits,
        transaction: result.transaction
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use "signup" or "purchase"' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Referral track error:', error);
    return NextResponse.json(
      { error: 'Failed to track referral' },
      { status: 500 }
    );
  }
}
