'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Star, Leaf } from 'lucide-react';
import Link from 'next/link';
import QuickAddButton from './QuickAddButton';
import VariantSelector from './VariantSelector';
import ScarcityBadge from './psychology/ScarcityBadge';
import SoldOutBadge, { PreorderNotice } from './psychology/SoldOutBadge';
import { PRODUCT_IMAGE_FALLBACK_SRC } from '@/lib/storefront-integrity';

export default function ProductCard({ product, onCheckout, variant = 'default' }) {
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

  const visibleBenefits = product.benefits?.slice(0, 2) || [];
  const remainingBenefits = (product.benefits?.length || 0) - 2;
  
  return (
    <Card 
      className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
      data-testid={`product-card-${product.id}`}
      data-product={product.id}
    >
      <Link href={`/product/${product.slug || product.id}`}>
        <div className="relative h-64 overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50">
          {usesInlineImage ? (
            <img
              src={resolvedImage}
              alt={productAlt}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <Image
              src={resolvedImage}
              alt={productAlt}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageError(true)}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          )}
          
          {product.featured && (
            <Badge 
              className="absolute top-3 right-3 bg-yellow-500 text-white border-none shadow-sm"
              data-testid="featured-badge"
            >
              <Star className="h-3 w-3 mr-1 fill-white" />
              Featured
            </Badge>
          )}
          
          {product.badge && !product.featured && (
            <Badge 
              className="absolute top-3 right-3 bg-emerald-600 text-white border-none shadow-sm"
              data-testid="special-badge"
            >
              {product.badge}
            </Badge>
          )}
          
          <SoldOutBadge stock={product.stock} />
        </div>
      </Link>
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2">{product.name}</CardTitle>
          {product.points && (
            <Badge 
              variant="outline" 
              className="text-xs border-emerald-600 text-emerald-600 shrink-0"
              data-testid="points-badge"
            >
              +{product.points} pts
            </Badge>
          )}
        </div>
        
        {product.subtitle && (
          <CardDescription className="mt-1 line-clamp-1">{product.subtitle}</CardDescription>
        )}
        
        {visibleBenefits.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {visibleBenefits.map((benefit, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs py-0.5">
                <Leaf className="w-3 h-3 mr-1" />
                {benefit}
              </Badge>
            ))}
            {remainingBenefits > 0 && (
              <Badge variant="outline" className="text-xs py-0.5 text-muted-foreground">
                +{remainingBenefits} more
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold text-emerald-600">${displayPrice.toFixed(2)}</span>
          {displaySize && (
            <span className="text-sm text-muted-foreground">/ {displaySize}</span>
          )}
        </div>
        <ScarcityBadge productId={product.id} stock={product.stock} threshold={product.lowStockThreshold} />
        <PreorderNotice stock={product.stock} />
        
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
        <div className="flex gap-2 w-full">
          <QuickAddButton 
            product={product}
            selectedVariant={selectedVariant || product.variations?.[0]}
            className="flex-1"
          />
          
          <Link href={`/product/${product.slug || product.id}`} className="flex-1">
            <Button 
              variant="outline" 
              className="w-full border-emerald-600 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-700 transition-colors"
              data-testid={`view-details-${product.id}`}
            >
              View Details
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
