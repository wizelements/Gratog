'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Package, Sparkles, Leaf, Heart, CheckCircle } from 'lucide-react';
import { HEALTH_BENEFIT_FILTERS, getBundleHealthBenefits } from '@/lib/health-benefits';

/**
 * Bundle Info Card
 * 
 * Displays bundle with combined health benefits from all included products
 * NO SELLING - Focus on combined wellness value
 */
export default function BundleInfoCard({ bundle, includedProducts = [] }) {
  const [imageError, setImageError] = useState(false);
  
  // Calculate combined benefits
  const combinedBenefits = useMemo(() => {
    if (includedProducts.length === 0) {
      return {
        healthBenefits: bundle.healthBenefits || [],
        uniqueIngredients: [],
        benefitLabels: (bundle.healthBenefits || []).map(id => HEALTH_BENEFIT_FILTERS[id]?.label).filter(Boolean)
      };
    }
    return getBundleHealthBenefits(includedProducts);
  }, [bundle, includedProducts]);
  
  const getProductImage = () => {
    if (bundle.images?.length > 0 && bundle.images[0] && !bundle.images[0].startsWith('data:')) {
      return bundle.images[0];
    }
    if (bundle.image && !bundle.image.startsWith('data:image/svg')) {
      return bundle.image;
    }
    return null;
  };
  
  const productImage = getProductImage();
  
  return (
    <Card className="overflow-hidden border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50">
      {/* Bundle Header */}
      <div className="relative">
        {/* Image or Placeholder */}
        <div className="h-48 bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center">
          {productImage ? (
            <Image
              src={imageError ? '/images/bundle-placeholder.svg' : productImage}
              alt={bundle.name}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="text-center">
              <Package className="h-16 w-16 text-teal-600 mx-auto mb-2" />
              <span className="text-teal-700 font-medium">Wellness Bundle</span>
            </div>
          )}
        </div>
        
        {/* Bundle Badge */}
        <Badge className="absolute top-3 left-3 bg-teal-600 text-white border-none shadow-md">
          <Package className="h-3.5 w-3.5 mr-1.5" />
          Bundle
        </Badge>
        
        {/* Savings indicator - info only */}
        {bundle.savingsPercent && (
          <Badge className="absolute top-3 right-3 bg-amber-500 text-white border-none shadow-md">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Great Value
          </Badge>
        )}
      </div>
      
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold text-gray-900">
          {bundle.name}
        </CardTitle>
        
        {bundle.description && (
          <p className="text-sm text-gray-600 mt-1">
            {bundle.description}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* What's Included */}
        {includedProducts.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle className="h-4 w-4 text-teal-600" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Includes {includedProducts.length} Products
              </span>
            </div>
            <div className="space-y-1.5">
              {includedProducts.slice(0, 4).map((product, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
                  {product.name}
                </div>
              ))}
              {includedProducts.length > 4 && (
                <div className="text-sm text-gray-500 italic">
                  +{includedProducts.length - 4} more products
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Combined Ingredients */}
        {combinedBenefits.uniqueIngredients.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Leaf className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Combined Ingredients ({combinedBenefits.uniqueIngredients.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {combinedBenefits.uniqueIngredients.slice(0, 8).map((ingredient, idx) => (
                <Badge 
                  key={idx}
                  variant="secondary" 
                  className="text-xs bg-emerald-50 text-emerald-700 py-0.5"
                >
                  {ingredient}
                </Badge>
              ))}
              {combinedBenefits.uniqueIngredients.length > 8 && (
                <Badge variant="outline" className="text-xs text-gray-400 py-0.5">
                  +{combinedBenefits.uniqueIngredients.length - 8} more
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {/* Combined Health Benefits */}
        {combinedBenefits.healthBenefits.length > 0 && (
          <div className="pt-3 border-t border-teal-100">
            <div className="flex items-center gap-1.5 mb-2">
              <Heart className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Combined Wellness Benefits
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {combinedBenefits.healthBenefits.map((benefitId, idx) => {
                const benefit = HEALTH_BENEFIT_FILTERS[benefitId];
                if (!benefit) return null;
                
                return (
                  <Badge 
                    key={idx}
                    className="text-xs bg-rose-50 text-rose-700 border-rose-200 py-1 px-2"
                  >
                    <span className="mr-1">{benefit.icon}</span>
                    {benefit.label}
                  </Badge>
                );
              })}
            </div>
            
            {/* Wellness Coverage Indicator */}
            <div className="mt-3 bg-teal-50 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-teal-700 font-medium">Wellness Coverage</span>
                <span className="text-teal-800 font-bold">
                  {combinedBenefits.healthBenefits.length} / {Object.keys(HEALTH_BENEFIT_FILTERS).length} goals
                </span>
              </div>
              <div className="mt-2 h-2 bg-teal-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all"
                  style={{ 
                    width: `${(combinedBenefits.healthBenefits.length / Object.keys(HEALTH_BENEFIT_FILTERS).length) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
