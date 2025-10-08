'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getProductBySlug } from '@/lib/products';
import { ArrowLeft, ShoppingCart, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ProductDetailPage() {
  const params = useParams();
  const product = getProductBySlug(params.slug);
  const [isLoading, setIsLoading] = useState(false);

  if (!product) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
        <Button asChild>
          <Link href="/catalog">Back to Catalog</Link>
        </Button>
      </div>
    );
  }

  const handleBuyNow = async () => {
    setIsLoading(true);
    try {
      const origin = window.location.origin;
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': origin,
        },
        body: JSON.stringify({
          items: [{ id: product.id, quantity: 1 }],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <Button asChild variant="ghost" className="mb-6">
        <Link href="/catalog">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Catalog
        </Link>
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Product Image */}
        <div className="relative h-[500px] rounded-lg overflow-hidden">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Product Details */}
        <div className="flex flex-col">
          <div className="mb-6">
            {product.featured && (
              <Badge className="mb-2 bg-[#D4AF37] hover:bg-[#B8941F]">Featured</Badge>
            )}
            <h1 className="text-4xl font-bold mb-2">{product.name}</h1>
            <p className="text-xl text-muted-foreground mb-4">{product.subtitle}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-[#D4AF37]">
                ${(product.price / 100).toFixed(2)}
              </span>
              <span className="text-muted-foreground">/ {product.size}</span>
            </div>
          </div>

          <Card className="p-6 mb-6">
            <p className="text-lg mb-4">{product.description}</p>
          </Card>

          {/* Benefits */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Key Benefits</h3>
            <div className="grid grid-cols-2 gap-2">
              {product.benefits?.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#D4AF37]" />
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ingredients */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Ingredients</h3>
            <p className="text-muted-foreground">{product.ingredients?.join(', ')}</p>
          </div>

          {/* Buy Button */}
          <Button
            size="lg"
            onClick={handleBuyNow}
            disabled={isLoading}
            className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-white text-lg"
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            {isLoading ? 'Processing...' : 'Buy Now'}
          </Button>
        </div>
      </div>
    </div>
  );
}
