// Server component wrapper - forces dynamic rendering
export const dynamic = 'force-dynamic';

import OrderPageClient from './OrderPage.client';

export default function OrderPage() {
  return <OrderPageClient />;
}
