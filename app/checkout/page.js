// Server component wrapper - forces dynamic rendering
export const dynamic = 'force-dynamic';

import CheckoutPageClient from './CheckoutPage.client';

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
