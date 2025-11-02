import { NextResponse } from 'next/server';
import RewardsSystem from '@/lib/rewards';
import { connectToDatabase } from '@/lib/db-optimized';

export async function POST(request) {
  try {
    const body = await request.json();
    const { passportId, email, marketName, activityType = 'visit' } = body;
    
    // FIX: Accept either passportId or email
    if (!passportId && !email) {
      return NextResponse.json(
        { success: false, error: 'Either passportId or email is required' },
        { status: 400 }
      );
    }
    
    if (!marketName) {
      return NextResponse.json(
        { success: false, error: 'Market name is required' },
        { status: 400 }
      );
    }
    
    // If email is provided but no passportId, look up the passport
    let finalPassportId = passportId;
    if (!finalPassportId && email) {
      const { db } = await connectToDatabase();
      const passport = await db.collection('passports').findOne({ email });
      
      if (!passport) {
        return NextResponse.json(
          { success: false, error: 'Passport not found for this email. Please create a passport first.' },
          { status: 404 }
        );
      }
      
      finalPassportId = passport._id.toString();
    }
    
    const result = await RewardsSystem.addStamp(finalPassportId, marketName, activityType);
    
    // Award any new vouchers
    if (result.rewards && result.rewards.length > 0) {
      const vouchers = await RewardsSystem.awardVouchers(finalPassportId, result.rewards);
      result.newVouchers = vouchers;
    }
    
    return NextResponse.json({
      success: true,
      stamp: result.stamp,
      rewards: result.rewards || [],
      newVouchers: result.newVouchers || [],
      passport: result.passport
    });
    
  } catch (error) {
    console.error('Add stamp error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add stamp' },
      { status: 500 }
    );
  }
}
