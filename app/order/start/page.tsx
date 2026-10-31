import { redirect } from 'next/navigation';
import { resolveMarketQrId } from '@/lib/market-qr-policy';

export const dynamic = 'force-dynamic';

/** Legacy printed QR link: preserve the selected market, never fabricate today's open status. */
export default async function LegacyMarketStart({ searchParams }: {
  searchParams: Promise<{ market?: string }>;
}) {
  const requested = (await searchParams).market;
  const marketId = resolveMarketQrId(requested);
  redirect(marketId ? `/m/${encodeURIComponent(marketId)}` : '/markets');
}
