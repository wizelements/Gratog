import { redirect } from 'next/navigation';

/**
 * Legacy market QR checkout is retired. It kept a detached React-only cart
 * and linked to /order/checkout, which had no page. Redirecting into the
 * canonical catalog ensures the same persisted cart and /checkout for every
 * standard shop order. The customer must still choose their fulfillment.
 */
export const dynamic = 'force-dynamic';

export default async function LegacyMarketMenu({
  searchParams,
}: {
  searchParams: Promise<{ market?: string; table?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams({ source: 'market-qr' });
  if (params.market) query.set('market', String(params.market).slice(0, 80));
  if (params.table) query.set('table', String(params.table).slice(0, 40));
  redirect(`/catalog?${query.toString()}`);
}
