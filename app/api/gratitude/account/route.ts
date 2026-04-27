import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { getAccount, getOrCreateAccount } from '@/lib/gratitude/accounts';
import { TIERS } from '@/lib/gratitude/core';

export const runtime = 'nodejs';

/**
 * GET /api/gratitude/account
 * Get customer's gratitude account
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Get or create account
    let account = await getAccount(customerId);
    if (!account) {
      account = await getOrCreateAccount(customerId);
    }
    
    // Get tier info
    const tierInfo = TIERS[account.tier.current];
    
    // Calculate progress to next tier
    const currentIndex = Object.keys(TIERS).indexOf(account.tier.current);
    const nextTierKey = Object.keys(TIERS)[currentIndex + 1];
    const nextTier = nextTierKey ? TIERS[nextTierKey] : null;
    
    return NextResponse.json({
      success: true,
      account: {
        id: account._id,
        customerId: account.customerId,
        credits: account.credits,
        tier: {
          current: account.tier.current,
          name: tierInfo.name,
          emoji: tierInfo.emoji,
          color: tierInfo.color,
          benefits: tierInfo.benefits,
          achievedAt: account.tier.achievedAt,
          progress: account.tier.progress
        },
        nextTier: nextTier ? {
          id: nextTierKey,
          name: nextTier.name,
          emoji: nextTier.emoji,
          requirements: nextTier.requirements,
          benefits: nextTier.benefits
        } : null,
        referrals: account.referrals,
        stats: account.stats,
        expiresAt: account.expiresAt
      }
    });
    
  } catch (error) {
    console.error('Gratitude account fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gratitude/account
 * Create a new gratitude account (usually auto-created, but manual option)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, signupBonus = 50, referredBy } = body;
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Check if exists
    const existing = await getAccount(customerId);
    if (existing) {
      return NextResponse.json({
        success: true,
        created: false,
        message: 'Account already exists',
        account: existing
      });
    }
    
    const { createAccount } = await import('@/lib/gratitude/accounts');
    const account = await createAccount(customerId, { 
      signupBonus,
      referredBy
    });
    
    return NextResponse.json({
      success: true,
      created: true,
      account
    });
    
  } catch (error) {
    console.error('Gratitude account create error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
