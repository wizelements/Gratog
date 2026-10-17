import { redirect } from 'next/navigation';

/**
 * Retired parallel receipt verifier. Legacy flow treated a bare order status
 * as payment proof and could show "Payment Successful" without a captured
 * payment. The one canonical receipt screen only trusts server-verified paid
 * state and an authenticated order-scoped lookup.
 */
export const dynamic = 'force-dynamic';

export default async function LegacyOrderComplete({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; orderRef?: string }>;
}) {
  const params = await searchParams;
  const orderRef = typeof params.orderRef === 'string' ? params.orderRef :
    typeof params.order === 'string' ? params.order : '';
  if (!orderRef || orderRef.length > 120) redirect('/order/success');
  redirect(`/order/success?orderRef=${encodeURIComponent(orderRef)}`);
}
