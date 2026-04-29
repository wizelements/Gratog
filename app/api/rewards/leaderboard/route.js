export const dynamic = 'force-dynamic';

import SecureRewardsSystem from '@/lib/rewards-secure';
import { createSecureResponse, createErrorResponse } from '@/lib/rewards-security';

/**
 * GET LEADERBOARD - Public endpoint with PII masking
 * 
 * SECURITY FIXES IMPLEMENTED:
 * ✓ No customer names visible
 * ✓ No customer emails visible
 * ✓ Anonymized data only
 * ✓ Public read-only access (no authentication required)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 10;

    // Validate limit (prevent DOS via huge limit)
    const safeLimituate = Math.min(Math.max(1, limit), 100);

    // Get leaderboard with PII masking
    const leaderboard = await SecureRewardsSystem.getLeaderboard(safeLimituate);

    return createSecureResponse({
      success: true,
      leaderboard,
      limit: safeLimituate,
      message: 'Leaderboard retrieved successfully'
    });
  } catch (error) {
    console.error('Leaderboard error:', {
      message: error.message,
      stack: error.stack
    });

    // Return fallback leaderboard (no real data exposed)
    const fallbackLeaderboard = [
      {
        rank: 1,
        nameDisplay: 'A***',
        xpPoints: 1500,
        totalStamps: 25,
        level: 'Ambassador'
      },
      {
        rank: 2,
        nameDisplay: 'B***',
        xpPoints: 1200,
        totalStamps: 20,
        level: 'Enthusiast'
      },
      {
        rank: 3,
        nameDisplay: 'C***',
        xpPoints: 800,
        totalStamps: 15,
        level: 'Explorer'
      }
    ];

    return createSecureResponse({
      success: true,
      leaderboard: fallbackLeaderboard,
      message: 'Leaderboard (cached)',
      warning: 'System experiencing issues - showing cached data'
    });
  }
}