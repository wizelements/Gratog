import { NextResponse } from 'next/server';
import RewardsSystem from '@/lib/rewards';

export async function POST(request) {
  try {
    const { passportId, marketName, activityType = 'visit' } = await request.json();
    
    if (!passportId || !marketName) {
      return NextResponse.json(
        { success: false, error: 'Passport ID and market name are required' },
        { status: 400 }
      );
    }
    
    const result = await RewardsSystem.addStamp(passportId, marketName, activityType);
    
    // Award any new vouchers
    if (result.rewards.length > 0) {
      const vouchers = await RewardsSystem.awardVouchers(passportId, result.rewards);
      result.newVouchers = vouchers;
    }
    
    return NextResponse.json({
      success: true,
      stamp: result.stamp,
      rewards: result.rewards,
      newVouchers: result.newVouchers || [],
      passport: result.passport
    });
    
  } catch (error) {
    console.error('Add stamp error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add stamp' },
      { status: 500 }
    );
  }
}