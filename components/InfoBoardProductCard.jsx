'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Sparkles, Leaf, Heart, Droplets } from 'lucide-react';
import { HEALTH_BENEFIT_FILTERS } from '@/lib/health-benefits';
import { PRODUCT_IMAGE_FALLBACK_SRC } from '@/lib/storefront-integrity';

/**
 * Info Board Product Card
 * 
 * Designed for market kiosk display - NO selling elements
 * Focus: Product info, ingredients, health benefits
 * 
 * Removed: Add to Cart, Quick Add, Price emphasis, Checkout CTAs
 * Added: Health benefit badges, ingredient spotlight, benefit descriptions
 */
export default function InfoBoardProductCard({ product }) {
  const [imageError, setImageError] = useState(false);
  
  const fallbackImage = PRODUCT_IMAGE_FALLBACK_SRC;
  
  const getProductImage = () => {
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
  
  // Get visible ingredients (up to 4)
  const visibleIngredients = (product.ingredients || []).slice(0, 4);
  const remainingIngredients = (product.ingredients?.length || 0) - 4;
  
  // Get health benefits
  const healthBenefits = (product.healthBenefits || []).slice(0, 3);
  
  // Get category info
  const categoryData = product.categoryData || {};
  
  return (
    <Card 
      className="group overflow-hidden transition-all duration-300 hover:shadow-lg border-2 border-emerald-100 bg-white"
      data-testid={`info-card-${product.id}`}
    >
      {/* Product Image */}
      <div className="relative h-56 overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50">
        {usesInlineImage ? (
          <img
            src={resolvedImage}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <Image
            src={resolvedImage}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImageError(true)}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        )}
        
        {/* Category Badge */}
        {categoryData.icon && (
          <Badge 
            className="absolute top-3 left-3 bg-white/95 text-emerald-700 border-emerald-200 shadow-sm text-sm px-3 py-1"
          >
            <span className="mr-1.5">{categoryData.icon}</span>
            {product.intelligentCategory || 'Wellness'}
          </Badge>
        )}
        
        {/* Featured indicator */}
        {product.featured && (
          <div className="absolute top-3 right-3 bg-amber-400 text-amber-900 rounded-full p-2 shadow-md">
            <Sparkles className="h-4 w-4" />
          </div>
        )}
      </div>
      
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold text-gray-900 line-clamp-2">
          {product.name}
        </CardTitle>
        
        {/* Benefit Story - The key educational content */}
        {product.benefitStory && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
            {product.benefitStory}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Ingredients Section */}
        {visibleIngredients.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Leaf className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Key Ingredients
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {visibleIngredients.map((ingredient, idx) => {
                const isObject = typeof ingredient === 'object';
                const name = isObject ? ingredient.name : ingredient;
                const icon = isObject ? ingredient.icon : '';
                
                return (
                  <Badge 
                    key={idx}
                    variant="secondary" 
                    className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 py-1 px-2"
                  >
                    {icon && <span className="mr-1">{icon}</span>}
                    {name}
                  </Badge>
                );
              })}
              {remainingIngredients > 0 && (
                <Badge variant="outline" className="text-xs text-gray-400 py-1">
                  +{remainingIngredients} more
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {/* Health Benefits Section */}
        {healthBenefits.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Heart className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Wellness Benefits
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {healthBenefits.map((benefitId, idx) => {
                const benefit = HEALTH_BENEFIT_FILTERS[benefitId];
                if (!benefit) return null;
                
                return (
                  <Badge 
                    key={idx}
                    className="text-xs bg-blue-50 text-blue-700 border-blue-200 py-1 px-2"
                  >
                    <span className="mr-1">{benefit.icon}</span>
                    {benefit.label}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Size/Format indicator - info only, not price */}
        {product.variations && product.variations.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <Droplets className="h-4 w-4 text-teal-500" />
            <span className="text-sm text-gray-600">
              Available in: {product.variations.map(v => v.name).join(', ')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
