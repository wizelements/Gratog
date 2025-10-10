'use client';

import ProductCard from '@/components/ProductCard';
import { PRODUCTS } from '@/lib/products';
import { toast } from 'sonner';

export default function CatalogPage() {
  const handleCheckout = async (items) => {
    try {
      // Redirect to order page for Square checkout flow
      window.location.href = '/order';
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    }
  };

  return (
    <div className="container py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Products</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Explore our full collection of premium sea moss gel products, each uniquely crafted to support your wellness journey
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {PRODUCTS.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onCheckout={handleCheckout}
          />
        ))}
      </div>
    </div>
  );
}
