export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import GratitudeBoxPage from '@/components/subscriptions/GratitudeBoxPage';
import { getActiveMarketPickups } from '@/data/markets';
import { BUNDLES, getFeaturedBundles } from '@/data/bundles';

export const metadata: Metadata = {
  title: 'Gratitude Box Weekly Subscription | Taste of Gratitude',
  description: 'Reserve a weekly box of sea moss gels, lemonades, refreshers, and wellness shots for pickup at your Atlanta farmers market. Pause or skip any week.',
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
