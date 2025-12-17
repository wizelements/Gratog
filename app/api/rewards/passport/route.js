import { NextResponse } from 'next/server';
import { rewardsSystem } from '@/lib/enhanced-rewards';

export async function POST(request) {
  try {
    const { email, name } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Use enhanced rewards system with robust fallback
    const passport = await rewardsSystem.createOrGetPassport(email, name, true);
    
    return NextResponse.json({
      success: true,
      passport,
      message: passport.isFallback ? 'Passport created in offline mode' : 'Passport loaded successfully'
    });
    
  } catch (error) {
    console.error('Passport creation error:', { error: error.message, stack: error.stack });
    
    // Create emergency fallback passport
    const fallbackPassport = {
      email: request.body?.email || 'unknown@example.com',
      points: 0,
      totalPointsEarned: 0,
      level: 'EXPLORER',
      levelInfo: {
        name: 'Explorer',
        emoji: '🌱',
        min: 0,
        max: 99
      },
      progressToNext: {
        progress: 0,
        pointsToNext: 100,
        isMaxLevel: false,
        nextLevel: {
          name: 'Enthusiast',
          emoji: '🌿'
        }
      },
      availableRewards: [],
      activities: [],
      createdAt: new Date(),
      isFallback: true,
      isEmergencyFallback: true
    };
    
    return NextResponse.json({
      success: true,
      passport: fallbackPassport,
      message: 'Emergency fallback passport created',
      warning: 'System temporarily offline - data will sync when restored'
    });
  }
}

// GET endpoint to retrieve passport
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
    
    const passport = await rewardsSystem.createOrGetPassport(email, null, true);
    
    return NextResponse.json({
      success: true,
      passport,
      message: passport.isFallback ? 'Passport in offline mode' : 'Passport retrieved successfully'
    });
    
  } catch (error) {
    console.error('Get passport error:', { error: error.message, stack: error.stack });
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve passport' },
      { status: 500 }
    );
  }
}