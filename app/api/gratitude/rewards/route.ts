import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { getActiveRewards } from '@/lib/gratitude/rewards-catalog';
import { getAccount } from '@/lib/gratitude/accounts';

export const runtime = 'nodejs';

/**
 * GET /api/gratitude/rewards
 * Get available rewards catalog
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const includeAll = searchParams.get('all') === 'true'; // Admin view
    
    await connectToDatabase();
    
    let tier = null;
    let balance = 0;
    
    // If customerId provided, get their tier for filtering
    if (customerId) {
      const account = await getAccount(customerId);
      if (account) {
        tier = account.tier.current;
        balance = account.credits.balance;
      }
    }
    
    const rewards = await getActiveRewards({
      tier,
      includeInactive: includeAll
    });
    
    // Calculate affordability
    const rewardsWithAffordability = rewards.map(r => ({
      ...r,
      affordable: balance >= r.creditsCost,
      creditsNeeded: Math.max(0, r.creditsCost - balance)
    }));
    
    // Group by category
    const grouped = {
      discounts: rewardsWithAffordability.filter(r => 
        r.rewardType === 'discount_fixed' || r.rewardType === 'discount_percent'
      ),
      shipping: rewardsWithAffordability.filter(r => 
        r.rewardType === 'free_shipping'
      ),
      products: rewardsWithAffordability.filter(r => 
        r.rewardType === 'free_product'
      ),
      experiences: rewardsWithAffordability.filter(r => 
        r.rewardType === 'experience'
      )
    };
    
    return NextResponse.json({
      success: true,
      rewards: rewardsWithAffordability,
      grouped,
      customer: customerId ? {
        tier,
        balance,
        canAffordAny: rewards.some(r => balance >= r.creditsCost)
      } : null
    });
    
  } catch (error) {
    console.error('Gratitude rewards error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rewards' },
      { status: 500 }
    );
  }
}
