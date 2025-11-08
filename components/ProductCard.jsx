'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { ShoppingCart, Star, Leaf, Sparkles } from 'lucide-react';
import Link from 'next/link';
import QuickAddButton from './QuickAddButton';
import VariantSelector from './VariantSelector';

export default function ProductCard({ product, onCheckout, variant = 'default' }) {
  const [imageError, setImageError] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  
  const fallbackImage = '/images/sea-moss-default.svg';
  
  // Determine if product has multiple variants
  const hasMultipleVariants = product.variations && product.variations.length > 1;
  
  // Get display price - use selected variant or first variant or product price
  const displayPrice = selectedVariant?.price 
    || product.variations?.[0]?.price 
    || product.price 
    || 0;
  
  // Get display size
  const displaySize = selectedVariant?.name 
    || product.variations?.[0]?.name 
    || product.size 
    || '';
  
  return (
    <Card 
      className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
      data-testid={`product-card-${product.id}`}
      data-product={product.id}
    >
      <Link href={`/product/${product.slug || product.id}`}>
        <div className="relative h-64 overflow-hidden bg-gradient-to-br from-emerald-100 to-teal-100">
          {product.image || product.images?.[0] ? (
            <Image
              src={imageError ? fallbackImage : (product.image || product.images[0])}
              alt={`${product.name} - Premium wildcrafted sea moss product`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              onError={() => setImageError(true)}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Sparkles className="h-16 w-16 text-emerald-600" />
            </div>
          )}
          
          {product.featured && (
            <Badge 
              className="absolute top-3 right-3 bg-yellow-600 text-white border-none"
              data-testid="featured-badge"
            >
              <Star className="h-3 w-3 mr-1 fill-white" />
              Featured
            </Badge>
          )}
          
          {product.badge && (
            <Badge 
              className="absolute top-3 left-3 bg-emerald-600 text-white border-none"
              data-testid="special-badge"
            >
              {product.badge}
            </Badge>
          )}
        </div>
      </Link>
      
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2">{product.name}</CardTitle>
            {product.subtitle && (
              <CardDescription className="mt-1 line-clamp-1">{product.subtitle}</CardDescription>
            )}
          </div>
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
        
        {product.benefits && product.benefits.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {product.benefits.slice(0, 2).map((benefit, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                <Leaf className="w-3 h-3 mr-1" />
                {benefit}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-2xl font-bold text-emerald-600">${displayPrice.toFixed(2)}</span>
          {displaySize && (
            <span className="text-sm text-muted-foreground">/ {displaySize}</span>
          )}
        </div>
        
        {/* Variant Selector - only show if multiple variants */}
        {hasMultipleVariants && (
          <div className="mb-4">
            <VariantSelector
              variations={product.variations}
              defaultVariant={product.variations[0]}
              onVariantChange={setSelectedVariant}
            />
          </div>
        )}
        
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col gap-2">
        <div className="flex gap-2 w-full">
          <QuickAddButton 
            product={product}
            selectedVariant={selectedVariant || product.variations?.[0]}
            className="flex-1"
          />
          
          <Link href={`/product/${product.slug || product.id}`} className="flex-1">
            <Button 
              variant="outline" 
              className="w-full border-emerald-600 text-emerald-700 hover:bg-emerald-50"
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
