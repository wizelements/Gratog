import { NextResponse } from 'next/server';
import { rewardsSystem } from '@/lib/enhanced-rewards';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 10;
    
    // Get leaderboard with fallback
    const leaderboard = await rewardsSystem.getLeaderboard(limit, true);
    
    return NextResponse.json({
      success: true,
      leaderboard,
      limit,
      message: leaderboard.some(l => l.isFallback) 
        ? 'Leaderboard in offline mode'
        : 'Leaderboard retrieved successfully'
    });
    
  } catch (error) {
    console.error('Leaderboard error:', error);
    
    // Return fallback leaderboard
    const fallbackLeaderboard = [
      { 
        rank: 1, 
        name: 'Wellness Champion', 
        points: 1500, 
        level: 'GRATITUDE_GURU',
        levelInfo: { name: 'Gratitude Guru', emoji: '✨' }
      },
      { 
        rank: 2, 
        name: 'Health Hero', 
        points: 800, 
        level: 'SEA_MOSS_SAGE',
        levelInfo: { name: 'Sea Moss Sage', emoji: '🧙‍♀️' }
      },
      { 
        rank: 3, 
        name: 'Natural Navigator', 
        points: 450, 
        level: 'WELLNESS_WARRIOR',
        levelInfo: { name: 'Wellness Warrior', emoji: '💚' }
      }
    ];
    
    return NextResponse.json({
      success: true,
      leaderboard: fallbackLeaderboard,
      isFallback: true,
      message: 'Emergency fallback leaderboard',
      warning: 'System temporarily offline'
    });
  }
}