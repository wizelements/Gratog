import { NextResponse } from 'next/server';
import { rewardsSystem } from '@/lib/enhanced-rewards';

export async function POST(request) {
  try {
    const { email, rewardId } = await request.json();
    
    if (!email || !rewardId) {
      return NextResponse.json(
        { success: false, error: 'Email and reward ID are required' },
        { status: 400 }
      );
    }
    
    // Redeem reward using enhanced system
    const result = await rewardsSystem.redeemReward(email, rewardId, true);
    
    return NextResponse.json({
      success: true,
      redemption: result.redemption,
      remainingPoints: result.remainingPoints,
      passport: result.passport,
      isFallback: result.isFallback,
      message: result.isFallback 
        ? 'Reward redeemed offline - will sync when connection is restored'
        : 'Reward redeemed successfully'
    });
    
  } catch (error) {
    console.error('Redeem reward error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to redeem reward' },
      { status: 500 }
    );
  }
}

// GET endpoint to get available rewards
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email parameter is required' },
        { status: 400 }
      );
    }
    
    // Get passport to determine available rewards
    const passport = await rewardsSystem.createOrGetPassport(email, null, true);
    
    return NextResponse.json({
      success: true,
      availableRewards: passport.availableRewards || [],
      currentPoints: passport.points || 0,
      level: passport.level,
      levelInfo: passport.levelInfo,
      message: passport.isFallback 
        ? 'Rewards in offline mode'
        : 'Available rewards retrieved successfully'
    });
    
  } catch (error) {
    console.error('Get rewards error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve rewards' },
      { status: 500 }
    );
  }
}