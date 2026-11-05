export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getActiveMarketPickups } from '@/data/markets';
import { getMarketingClient, marketingCampaignMetrics } from '@/lib/marketing/turso-store.mjs';

export async function GET(request: NextRequest) {
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const adminToken = process.env.ADMIN_API_TOKEN;
  const warmToken = process.env.WEEKLY_WARM_CRON_SECRET;
  if (!bearer || !((adminToken && bearer === adminToken) || (warmToken && bearer === warmToken))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const marketId = request.nextUrl.searchParams.get('marketId') || 'serenbe';
  if (!getActiveMarketPickups().some(m => m.id === marketId)) {
    return NextResponse.json({ error: 'Market is paused or unavailable' }, { status: 400 });
  }
  try {
    const stats = await marketingCampaignMetrics(getMarketingClient(), marketId);
    return NextResponse.json({
      marketId,
      ...stats,
      verifiedOrdersFromMarketing: null,
      verifiedRevenueCentsFromMarketing: null,
      squareAttributionCertified: false,
      note: 'Email sends represent provider acceptance, not proven delivery or sales. Revenue requires verified Square order correlation.',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Marketing metrics unavailable' }, { status: 503 });
  }
}
