'use client';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import React from 'react';
import { MarketDayDashboard } from '@/components/market/MarketDayDashboard';

export default function AdminMarketDayPage() {
  return (
    <MarketDayDashboard marketId="serenbe-farmers-market" />
  );
}
