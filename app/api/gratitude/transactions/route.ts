import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { getTransactionHistory, getRedemptionHistory } from '@/lib/gratitude/transactions';

export const runtime = 'nodejs';

/**
 * GET /api/gratitude/transactions
 * Get transaction history for a customer
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type'); // 'earn', 'redeem', 'expire', etc.
    const includeRedemptions = searchParams.get('includeRedemptions') === 'true';
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    const [transactions, redemptions] = await Promise.all([
      getTransactionHistory(customerId, { limit, type }),
      includeRedemptions ? getRedemptionHistory(customerId) : Promise.resolve([])
    ]);
    
    return NextResponse.json({
      success: true,
      transactions: transactions.map(t => ({
        id: t._id,
        type: t.type,
        credits: t.credits,
        description: t.description,
        source: t.source,
        createdAt: t.createdAt,
        expiresAt: t.expiresAt,
        expired: t.expired || false
      })),
      redemptions: includeRedemptions ? redemptions.map(r => ({
        id: r._id,
        rewardId: r.rewardId,
        couponCode: r.couponCode,
        creditsCost: r.creditsCost,
        rewardType: r.rewardType,
        applied: r.applied,
        expiresAt: r.expiresAt,
        createdAt: r.createdAt
      })) : undefined
    });
    
  } catch (error) {
    console.error('Gratitude transactions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
