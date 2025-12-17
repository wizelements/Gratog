import { NextResponse } from 'next/server';
import { rewardsSystem } from '@/lib/enhanced-rewards';

export async function POST(request) {
  try {
    const { email, points, activityType, activityData = {} } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }
    
    if (!points || points <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid points value is required' },
        { status: 400 }
      );
    }
    
    if (!activityType) {
      return NextResponse.json(
        { success: false, error: 'Activity type is required' },
        { status: 400 }
      );
    }
    
    // Add points using enhanced rewards system with fallback
    const result = await rewardsSystem.addPoints(email, points, activityType, activityData, true);
    
    return NextResponse.json({
      success: true,
      pointsAdded: result.points,
      totalPoints: result.totalPoints,
      levelUp: result.levelUp,
      newLevel: result.newLevel,
      passport: result.passport,
      isFallback: result.isFallback,
      message: result.isFallback 
        ? `Points added offline (${points} pts for ${activityType})` 
        : `Successfully added ${points} points for ${activityType}`
    });
    
  } catch (error) {
    console.error('Add points error:', { error: error.message, stack: error.stack });
    
    // Attempt to store in localStorage as emergency fallback
    try {
      const { email, points, activityType, activityData } = await request.json();
      rewardsSystem.storePendingActivity(email, points, activityType, activityData);
      
      return NextResponse.json({
        success: true,
        pointsAdded: points,
        isFallback: true,
        isEmergencyFallback: true,
        message: `Points queued for sync (${points} pts for ${activityType})`,
        warning: 'System temporarily offline - points will sync when restored'
      });
    } catch (fallbackError) {
      console.error('Emergency fallback failed:', { error: fallbackError.message, stack: fallbackError.stack });
      return NextResponse.json(
        { success: false, error: 'Failed to add points' },
        { status: 500 }
      );
    }
  }
}

// GET endpoint to sync pending activities
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const action = searchParams.get('action');
    
    if (action === 'sync' && email) {
      const syncResult = await rewardsSystem.syncPendingActivities(email);
      
      return NextResponse.json({
        success: true,
        syncResult,
        message: `Synced ${syncResult.synced}/${syncResult.total} pending activities`
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action or missing email' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Sync error:', { error: error.message, stack: error.stack });
    return NextResponse.json(
      { success: false, error: 'Failed to sync activities' },
      { status: 500 }
    );
  }
}