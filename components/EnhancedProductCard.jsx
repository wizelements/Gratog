'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { ShoppingCart, Star, Sparkles, Eye } from 'lucide-react';
import Link from 'next/link';
import QuickAddButton from './QuickAddButton';
import QuickViewModal from './QuickViewModal';
import VariantSelector from './VariantSelector';
import WishlistButton from './WishlistButton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function EnhancedProductCard({ product, onCheckout, variant = 'default' }) {
  const [imageError, setImageError] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const fallbackImage = '/images/sea-moss-default.svg';
  const hasIngredientData = product.ingredients && product.ingredients.length > 0;
  
  const getProductImage = () => {
    if (product.images?.length > 0 && product.images[0] && !product.images[0].startsWith('data:')) {
      return product.images[0];
    }
    if (product.image && !product.image.startsWith('data:image/svg')) {
      return product.image;
    }
    return null;
  };
  
  const productImage = getProductImage();
  const hasMultipleVariants = product.variations && product.variations.length > 1;
  
  const displayPrice = selectedVariant?.price 
    || product.variations?.[0]?.price 
    || product.price 
    || 0;
  
  const displaySize = selectedVariant?.name 
    || product.variations?.[0]?.name 
    || product.size 
    || '';

  const visibleIngredients = product.ingredients?.slice(0, 2) || [];
  const remainingIngredients = (product.ingredients?.length || 0) - 2;
  
  const visibleTags = product.tags?.slice(0, 2) || [];
  const remainingTags = (product.tags?.length || 0) - 2;
  
  return (
    <Card 
      className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border"
      data-testid={`enhanced-product-card-${product.id}`}
      data-product={product.id}
    >
      <Link href={`/product/${product.slug || product.id}`}>
        <div className="relative h-64 overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50">
          {productImage ? (
            <Image
              src={imageError ? fallbackImage : productImage}
              alt={`${product.name} - ${product.benefitStory || 'Premium wellness product'}`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageError(true)}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-100 via-teal-50 to-emerald-50">
              <div className="w-24 h-24 rounded-full bg-white/90 flex items-center justify-center shadow-md">
                <Sparkles className="h-12 w-12 text-emerald-500" />
              </div>
              <span className="mt-4 text-sm text-emerald-600/80 font-medium">Premium Product</span>
            </div>
          )}
          
          <div className="absolute top-3 right-3 z-10">
            <WishlistButton productId={product.id || product.slug} size="small" />
          </div>
          
          {product.featured && (
            <Badge 
              className="absolute top-3 left-3 bg-yellow-500 text-white border-none shadow-sm"
              data-testid="featured-badge"
            >
              <Star className="h-3 w-3 mr-1 fill-white" />
              Featured
            </Badge>
          )}
        </div>
      </Link>
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2 group-hover:text-emerald-600 transition-colors">
            {product.name}
          </CardTitle>
          
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
        
        {product.benefitStory && (
          <CardDescription className="mt-1.5 text-sm line-clamp-2">
            {product.benefitStory}
          </CardDescription>
        )}
        
        {!product.benefitStory && product.description && (
          <CardDescription className="mt-1 line-clamp-1">{product.description}</CardDescription>
        )}
        
        {hasIngredientData && visibleIngredients.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            <TooltipProvider>
              {visibleIngredients.map((ingredient, idx) => {
                const isObject = typeof ingredient === 'object';
                const ingredientName = isObject ? ingredient.name : ingredient;
                const ingredientIcon = isObject ? ingredient.icon : '';
                const ingredientBenefits = isObject ? ingredient.benefits : [];
                
                return (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="secondary" 
                        className="text-xs cursor-help bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-0.5"
                      >
                        {ingredientIcon && `${ingredientIcon} `}{ingredientName}
                      </Badge>
                    </TooltipTrigger>
                    {ingredientBenefits.length > 0 && (
                      <TooltipContent>
                        <p className="text-xs font-semibold">Benefits:</p>
                        <ul className="text-xs list-disc list-inside">
                          {ingredientBenefits.map((benefit, bidx) => (
                            <li key={bidx}>{benefit}</li>
                          ))}
                        </ul>
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
              {remainingIngredients > 0 && (
                <Badge variant="outline" className="text-xs text-muted-foreground py-0.5">
                  +{remainingIngredients} more
                </Badge>
              )}
            </TooltipProvider>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold text-emerald-600">
            ${typeof displayPrice === 'number' ? displayPrice.toFixed(2) : '0.00'}
          </span>
          {displaySize && (
            <span className="text-sm text-muted-foreground">/ {displaySize}</span>
          )}
        </div>
        
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
        
        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {visibleTags.map((tag, idx) => (
              <span 
                key={idx}
                className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
              >
                #{tag}
              </span>
            ))}
            {remainingTags > 0 && (
              <span className="text-xs px-2 py-0.5 text-gray-400">
                +{remainingTags} more
              </span>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-0 flex gap-2">
        <QuickAddButton 
          product={product}
          selectedVariant={selectedVariant || product.variations?.[0]}
          className="flex-1"
        />
        
        <Button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowQuickView(true);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowQuickView(true);
          }}
          variant="outline"
          className="flex-1 border-emerald-600 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-700 active:bg-emerald-100 transition-colors"
          type="button"
        >
          <Eye className="mr-2 h-4 w-4" />
          Quick View
        </Button>
      </CardFooter>
      
      {isClient && (
        <QuickViewModal 
          product={product}
          isOpen={showQuickView}
          onClose={() => setShowQuickView(false)}
        />
      )}
    </Card>
  );
}
