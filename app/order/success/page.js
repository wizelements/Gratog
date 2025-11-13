// Server component wrapper - forces dynamic rendering
export const dynamic = 'force-dynamic';

import OrderSuccessPageEnhanced from './page-enhanced';

export default function OrderSuccessPage() {
  return <OrderSuccessPageEnhanced />;
}
