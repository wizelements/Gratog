'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Eye } from 'lucide-react';
import { useState } from 'react';

export default function ProductCard({ product, onCheckout }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleBuyNow = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onCheckout([{ id: product.id, quantity: 1 }]);
    setIsLoading(false);
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="p-0">
        <Link href={`/product/${product.slug}`}>
          <div className="relative h-64 w-full overflow-hidden bg-muted">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        </Link>
      </CardHeader>
      <CardContent className="p-4">
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-semibold text-lg mb-1 hover:text-[#D4AF37] transition-colors">
            {product.name}
          </h3>
          <p className="text-sm text-muted-foreground mb-2">{product.subtitle}</p>
          <p className="text-2xl font-bold text-[#D4AF37]">${(product.price / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{product.size}</p>
        </Link>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button
          onClick={handleBuyNow}
          disabled={isLoading}
          className="flex-1 bg-[#D4AF37] hover:bg-[#B8941F] text-white"
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {isLoading ? 'Processing...' : 'Buy Now'}
        </Button>
        <Button
          asChild
          variant="outline"
          size="icon"
        >
          <Link href={`/product/${product.slug}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
