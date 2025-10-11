'use client';

import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Eye } from 'lucide-react';
import { useState } from 'react';
import { ProductCardImage } from '@/components/ProductImage';

export default function ProductCard({ product, onCheckout }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleBuyNow = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onCheckout([{ id: product.id, quantity: 1 }]);
    setIsLoading(false);
  };

  return (
    <Card className="overflow-hidden hover-lift border-2 hover:border-[#D4AF37]/30 transition-all duration-300 group">
      <CardHeader className="p-0 relative">
        <Link href={`/product/${product.slug}`}>
          <div className="relative h-64 w-full overflow-hidden bg-muted">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {product.featured && (
              <div className="absolute top-3 right-3 bg-[#D4AF37] text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg z-10">
                Featured
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        </Link>
      </CardHeader>
      <CardContent className="p-4">
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-semibold text-lg mb-1 group-hover:text-[#D4AF37] transition-colors">
            {product.name}
          </h3>
          <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{product.subtitle}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-[#D4AF37]">${(product.price / 100).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">/ {product.size}</p>
          </div>
        </Link>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button
          onClick={handleBuyNow}
          disabled={isLoading}
          className="flex-1 bg-[#D4AF37] hover:bg-[#B8941F] text-white btn-shine shadow-md hover:shadow-lg transition-all"
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {isLoading ? 'Processing...' : 'Buy Now'}
        </Button>
        <Button
          asChild
          variant="outline"
          size="icon"
          className="hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all"
        >
          <Link href={`/product/${product.slug}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
