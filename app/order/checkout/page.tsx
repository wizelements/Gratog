import { redirect } from 'next/navigation';

/**
 * Compatibility-only redirect for old QR menu links. Regular purchases must
 * use /checkout with the single persisted cart, one order attempt and
 * server-verified Square payment. Never create an order in this route.
 */
export const dynamic = 'force-dynamic';

export default function LegacyOrderCheckout() {
  redirect('/checkout');
}
