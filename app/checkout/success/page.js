// Server component wrapper - forces dynamic rendering
export const dynamic = 'force-dynamic';

import CheckoutSuccessPageClient from './CheckoutSuccessPage.client';

export default function CheckoutSuccessPage() {
  return <CheckoutSuccessPageClient />;
}
