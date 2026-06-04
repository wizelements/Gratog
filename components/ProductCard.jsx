'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import QuickAddButton from './QuickAddButton';
import VariantSelector from './VariantSelector';
import { PRODUCT_IMAGE_FALLBACK_SRC } from '@/lib/storefront-integrity';

export default function ProductCard({ product }) {
  const [imageError, setImageError] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  
  const fallbackImage = PRODUCT_IMAGE_FALLBACK_SRC;
  const productAlt = product.imageAlt || `${product.name} - Premium wildcrafted sea moss product`;
  
  const getProductImage = () => {
    if (typeof product.displayImage === 'string' && product.displayImage.trim()) {
      return product.displayImage;
    }
    if (product.images?.length > 0 && typeof product.images[0] === 'string' && product.images[0].trim()) {
      return product.images[0];
    }
    if (typeof product.image === 'string' && product.image.trim()) {
      return product.image;
    }

    return fallbackImage;
  };

  const productImage = getProductImage();
  const resolvedImage = imageError ? fallbackImage : productImage;
  const usesInlineImage = Boolean(resolvedImage?.startsWith('data:'));
  const hasMultipleVariants = product.variations && product.variations.length > 1;
  
  const displayPrice = selectedVariant?.price 
    || product.variations?.[0]?.price 
    || product.price 
    || 0;
  
  const displaySize = selectedVariant?.name 
    || product.variations?.[0]?.name 
    || product.size 
    || '';

  const lowStockThreshold = product.lowStockThreshold || 5;
  const availabilityLabel = product.stock !== null && product.stock !== undefined && product.stock <= 0
    ? 'Preorder for Saturday pickup'
    : product.stock !== null && product.stock !== undefined && product.stock <= lowStockThreshold
      ? `Limited stock (${product.stock} left)`
      : null;
  
  return (
    <Card 
      className="group overflow-hidden border border-gray-200 transition-shadow duration-200 hover:shadow-md"
      data-testid={`product-card-${product.id}`}
      data-product={product.id}
    >
      <Link href={`/product/${product.slug || product.id}`}>
        <div className="relative h-64 overflow-hidden bg-gray-100">
          {usesInlineImage ? (
            <img
              src={resolvedImage}
              alt={productAlt}
              className="h-full w-full object-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <Image
              src={resolvedImage}
              alt={productAlt}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          )}
        </div>
      </Link>
      
      <CardHeader className="pb-2">
        <CardTitle className="text-lg line-clamp-2">{product.name}</CardTitle>
        
        {product.subtitle && (
          <CardDescription className="mt-1 line-clamp-1">{product.subtitle}</CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold text-emerald-600">${displayPrice.toFixed(2)}</span>
          {displaySize && (
            <span className="text-sm text-muted-foreground">/ {displaySize}</span>
          )}
        </div>
        {availabilityLabel && (
          <p className="mb-3 text-sm font-medium text-stone-600">{availabilityLabel}</p>
        )}
        
        {hasMultipleVariants && (
          <div className="mb-3">
            <VariantSelector
              variations={product.variations}
              defaultVariant={product.variations[0]}
              onVariantChange={setSelectedVariant}
              compact
            />
          </div>
        )}
        
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <QuickAddButton
          product={product}
          selectedVariant={selectedVariant || product.variations?.[0]}
          className="w-full"
        />
      </CardFooter>
    </Card>
  );
}
