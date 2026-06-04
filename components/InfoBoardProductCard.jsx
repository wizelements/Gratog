'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Leaf, Heart, Droplets } from 'lucide-react';
import { HEALTH_BENEFIT_FILTERS } from '@/lib/health-benefits';
import { PRODUCT_IMAGE_FALLBACK_SRC } from '@/lib/storefront-integrity';

/**
 * Info Board Product Card
 * 
 * Designed for market kiosk display - NO selling elements
 * Focus: Product info, ingredients, health benefits
 * 
 * Removed: Add to Cart, Quick Add, Price emphasis, Checkout CTAs
 * Added: Ingredient spotlight and plain-language benefit descriptions
 */
export default function InfoBoardProductCard({ product }) {
  const [imageError, setImageError] = useState(false);
  
  const fallbackImage = PRODUCT_IMAGE_FALLBACK_SRC;
  const productAlt = product.imageAlt || product.name;
  
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
  
  // Get visible ingredients (up to 4)
  const visibleIngredients = (product.ingredients || []).slice(0, 4);
  const remainingIngredients = (product.ingredients?.length || 0) - 4;
  
  // Get health benefits
  const healthBenefits = (product.healthBenefits || []).slice(0, 3);
  
  // Get category info
  const categoryData = product.categoryData || {};
  
  return (
    <Card 
      className="group overflow-hidden border border-gray-200 bg-white transition-shadow duration-200 hover:shadow-md"
      data-testid={`info-card-${product.id}`}
    >
      {/* Product Image */}
      <div className="relative h-56 overflow-hidden bg-gray-100">
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

      <CardHeader className="pb-2">
        {categoryData.icon && (
          <p className="mb-2 text-sm font-medium text-emerald-700">
            <span className="mr-1.5">{categoryData.icon}</span>
            {product.intelligentCategory || 'Wellness'}
          </p>
        )}
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
            <p className="text-sm text-gray-600">
              {visibleIngredients.map((ingredient) => {
                const isObject = typeof ingredient === 'object';
                const name = isObject ? ingredient.name : ingredient;
                const icon = isObject ? ingredient.icon : '';
                return `${icon ? `${icon} ` : ''}${name}`;
              }).join(', ')}{remainingIngredients > 0 ? `, +${remainingIngredients} more` : ''}
            </p>
          </div>
        )}
        
        {/* Health Benefits Section */}
        {healthBenefits.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Heart className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Product Notes
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {healthBenefits.map((benefitId) => {
                const benefit = HEALTH_BENEFIT_FILTERS[benefitId];
                return benefit ? `${benefit.icon} ${benefit.label}` : null;
              }).filter(Boolean).join(', ')}
            </p>
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
