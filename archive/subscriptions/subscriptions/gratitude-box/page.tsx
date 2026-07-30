export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import GratitudeBoxPage from '@/components/subscriptions/GratitudeBoxPage';
import { getActiveMarketPickups } from '@/data/markets';
import { BUNDLES, getFeaturedBundles } from '@/data/bundles';

export const metadata: Metadata = {
  title: 'Gratitude Box Pilot | Taste of Gratitude',
  description: 'Reserve a curated box of sea moss gels, lemonades, refreshers, and shots for pickup at your Atlanta farmers market. One box at a time while we build recurring billing.',
  alternates: { canonical: '/subscriptions/gratitude-box' },
};

export default async function GratitudeBoxLandingPage() {
  const markets = getActiveMarketPickups();
  const bundles = getFeaturedBundles();

  return (
    <GratitudeBoxPage
      markets={markets.map((m) => ({ id: m.id, name: m.shortName || m.name, pickupDays: m.pickupDays }))}
      bundles={bundles}
    />
  );
}
