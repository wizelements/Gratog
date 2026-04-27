import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { getAccount } from '@/lib/gratitude/accounts';
import { getRewardById } from '@/lib/gratitude/rewards-catalog';
import { redeemCredits } from '@/lib/gratitude/transactions';

export const runtime = 'nodejs';

/**
 * POST /api/gratitude/redeem
 * Redeem credits for a reward
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId,
      rewardId,
      cartTotal = 0 // Current cart total in cents
    } = body;
    
    if (!customerId || !rewardId) {
      return NextResponse.json(
        { error: 'customerId and rewardId required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Get account
    const account = await getAccount(customerId);
    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }
    
    // Get reward
    const reward = await getRewardById(rewardId);
    if (!reward) {
      return NextResponse.json(
        { error: 'Reward not found' },
        { status: 404 }
      );
    }
    
    if (!reward.active) {
      return NextResponse.json(
        { error: 'Reward is not active' },
        { status: 400 }
      );
    }
    
    // Attempt redemption
    const result = await redeemCredits({
      customerId,
      rewardId,
      rewardConfig: reward,
      cartTotal
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || result.errors?.join(', ') },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      redemption: result.redemption,
      creditsSpent: result.creditsSpent,
      newBalance: result.newBalance
    });
    
  } catch (error) {
    console.error('Gratitude redeem error:', error);
    return NextResponse.json(
      { error: 'Failed to redeem credits' },
      { status: 500 }
    );
  }
}
