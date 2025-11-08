// Server component wrapper - forces dynamic rendering
export const dynamic = 'force-dynamic';

import OrderSuccessPageClient from './OrderSuccessPage.client';

export default function OrderSuccessPage() {
  return <OrderSuccessPageClient />;
}
