// Server component wrapper - forces dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import OrderSuccessPageEnhanced from './page-enhanced';

export default function OrderSuccessPage() {
  return <OrderSuccessPageEnhanced />;
}
