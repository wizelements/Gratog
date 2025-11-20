import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSegmentCustomers } from '@/lib/campaign-manager';
import clientPromise from '@/lib/db-optimized';

/**
 * GET /api/admin/customers - Get customer list with optional segmentation
 */
export async function GET(request) {
  try {
    await requireAdmin(request);
    
    const { searchParams } = new URL(request.url);
    
    // Parse segment criteria from query params
    const segmentCriteria = {};
    if (searchParams.get('purchaseFrequency')) {
      segmentCriteria.purchaseFrequency = searchParams.get('purchaseFrequency');
    }
    if (searchParams.get('purchaseAmount')) {
      segmentCriteria.purchaseAmount = searchParams.get('purchaseAmount');
    }
    if (searchParams.get('rewardsTier')) {
      segmentCriteria.rewardsTier = searchParams.get('rewardsTier');
    }
    if (searchParams.get('challengeParticipation')) {
      segmentCriteria.challengeParticipation = searchParams.get('challengeParticipation');
    }
    if (searchParams.get('inactive') === 'true') {
      segmentCriteria.inactive = true;
    }
    if (searchParams.get('productPreferences')) {
      segmentCriteria.productPreferences = searchParams.get('productPreferences').split(',');
    }

    // Get matching customers
    const customers = await getSegmentCustomers(segmentCriteria);

    // Remove sensitive data
    const sanitizedCustomers = customers.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      createdAt: c.createdAt,
      emailPreferences: c.emailPreferences,
      rewards: c.rewards
    }));

    return NextResponse.json({
      success: true,
      customers: sanitizedCustomers,
      count: sanitizedCustomers.length,
      segmentCriteria
    });

  } catch (error) {
    console.error('Get customers error:', error);
    
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}
