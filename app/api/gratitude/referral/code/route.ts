import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { getOrCreateReferralCode, getReferralStats } from '@/lib/gratitude/referrals';

export const runtime = 'nodejs';

/**
 * GET /api/gratitude/referral/code
 * Get or create referral code for customer
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    const result = await getOrCreateReferralCode(customerId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      code: result.code,
      referredCount: result.referredCount
    });
    
  } catch (error) {
    console.error('Referral code error:', error);
    return NextResponse.json(
      { error: 'Failed to get referral code' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gratitude/referral/code
 * Generate share messages
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'share-messages') {
      const body = await request.json();
      const { code } = body;
      
      if (!code) {
        return NextResponse.json(
          { error: 'Referral code required' },
          { status: 400 }
        );
      }
      
      const { generateShareMessages } = await import('@/lib/gratitude/referrals');
      const messages = generateShareMessages(code);
      
      return NextResponse.json({
        success: true,
        messages
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Referral code POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
