import { redirect } from 'next/navigation';
import { resolveMarketQrId } from '@/lib/market-qr-policy';

export const dynamic = 'force-dynamic';

/** Retired kiosk cart route: its missing-inventory fallback was unsafe. */
export default async function LegacyMarketCart({ searchParams }: {
  searchParams: Promise<{ market?: string }>;
}) {
  const requested = (await searchParams).market;
  const marketId = resolveMarketQrId(requested);
  redirect(marketId ? `/m/${encodeURIComponent(marketId)}` : '/markets');
}
