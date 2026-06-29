'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import QuickAddButton from './QuickAddButton';
import VariantSelector from './VariantSelector';
import { PRODUCT_IMAGE_FALLBACK_SRC } from '@/lib/storefront-integrity';
import { getCanonicalProductCategoryIcon, getCanonicalProductCategoryLabel } from '@/lib/storefront-query';

export default function EnhancedProductCard({ product }) {
  const [imageError, setImageError] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  
  const fallbackImage = PRODUCT_IMAGE_FALLBACK_SRC;
  const hasIngredientData = product.ingredients && product.ingredients.length > 0;
  const productAlt = product.imageAlt || `${product.name} - ${product.benefitStory || 'Premium wellness product'}`;
  
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
  const categoryLabel = getCanonicalProductCategoryLabel(product, 'Wellness Staple');
  const categoryIcon = getCanonicalProductCategoryIcon(product, '🌿');
  
  const rawPrice = selectedVariant?.price
    || product.variations?.[0]?.price
    || product.price
    || 0;
  const displayPrice = Number.isFinite(Number(rawPrice)) ? Number(rawPrice) : 0;

  const displaySize = selectedVariant?.name
    || product.variations?.[0]?.name
    || product.size
    || '';

  const visibleIngredients = product.ingredients?.slice(0, 2) || [];
  const remainingIngredients = (product.ingredients?.length || 0) - 2;
  const lowStockThreshold = product.lowStockThreshold || 5;
  const availabilityLabel = product.soldOut || product.inventoryStatus === 'sold_out'
    ? 'Sold out'
    : product.preorderOnly || product.isPreorder
      ? 'Preorder for market pickup'
      : product.stock !== null && product.stock !== undefined && product.stock <= 0
    ? 'Preorder for Saturday pickup'
    : product.stock !== null && product.stock !== undefined && product.stock <= lowStockThreshold
      ? `Limited stock (${product.stock} left)`
      : null;
  
  return (
    <Card 
      className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-emerald-900/10 bg-white shadow-sm shadow-emerald-950/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-950/10"
      data-testid={`enhanced-product-card-${product.id}`}
      data-product={product.id}
    >
      <Link href={`/product/${product.slug || product.id}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
          {usesInlineImage ? (
            <img
              src={resolvedImage}
              alt={productAlt}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <Image
              src={resolvedImage}
              alt={productAlt}
              fill
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
              onError={() => setImageError(true)}
              sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw"
            />
          )}
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-emerald-900 shadow-sm backdrop-blur">
            <span aria-hidden="true">{categoryIcon}</span> {categoryLabel}
          </div>
        </div>
      </Link>
      
      <CardHeader className="px-4 pb-2 pt-4 sm:px-5">
        <CardTitle className="line-clamp-2 text-lg leading-snug tracking-tight text-stone-950">
          {product.name}
        </CardTitle>
        
        {product.benefitStory && (
          <CardDescription className="mt-1.5 line-clamp-2 text-sm leading-6 text-stone-600">
            {product.benefitStory}
          </CardDescription>
        )}
        
        {!product.benefitStory && product.description && (
          <CardDescription className="mt-1 line-clamp-1 text-stone-600">{product.description}</CardDescription>
        )}
        
        {hasIngredientData && visibleIngredients.length > 0 && (
          <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">
            Ingredients: {visibleIngredients.map((ingredient) => (
              typeof ingredient === 'object' ? ingredient.name : ingredient
            )).join(', ')}{remainingIngredients > 0 ? `, +${remainingIngredients} more` : ''}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 px-4 pt-0 sm:px-5">
        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-emerald-800">
            ${typeof displayPrice === 'number' ? displayPrice.toFixed(2) : '0.00'}
          </span>
          {displaySize && (
            <span className="text-sm text-muted-foreground">/ {displaySize}</span>
          )}
        </div>
        {availabilityLabel && (
          <p className="mb-3 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{availabilityLabel}</p>
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
        <p className="mt-3 text-xs font-medium text-emerald-800">
          Market pickup or eligible shipping at checkout
        </p>
      </CardContent>
      
      <CardFooter className="flex gap-2 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
        <QuickAddButton 
          product={product}
          selectedVariant={selectedVariant || product.variations?.[0]}
          className="h-11 flex-1 rounded-full bg-emerald-700 text-white hover:bg-emerald-800"
        />
      </CardFooter>
    </Card>
  );
}
