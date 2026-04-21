import CheckoutRoot from '@/components/checkout/CheckoutRoot';

export const metadata = {
  title: 'Checkout | Taste of Gratitude',
  description: 'Complete your order with secure checkout powered by Square'
};

export default function OrderPage() {
  return <CheckoutRoot />;
}
