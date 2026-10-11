import { redirect } from 'next/navigation';

// Retired legacy manual Square cart: it bypassed the store's authoritative
// price, Georgia eligibility, inventory and fulfillment verification and
// required customers to reconstruct an order on an unrelated cart.
// Direct all bookmarked links to the canonical server-verified checkout.
export default function RetiredSquareManualCartPage() {
  redirect('/checkout');
}
