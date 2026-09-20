'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, Heart, Droplets } from 'lucide-react';
import { HEALTH_BENEFIT_FILTERS } from '@/lib/health-benefits';
import ProductVisual from './ProductVisual';

/**
 * Info Board Product Card
 *
 * Designed for market kiosk display - NO selling elements
 * Focus: Product info, ingredients, product notes
 */
export default function InfoBoardProductCard({ product }) {
  const visibleIngredients = (product.ingredients || []).slice(0, 4);
  const remainingIngredients = (product.ingredients?.length || 0) - 4;
  const healthBenefits = (product.healthBenefits || []).slice(0, 3);
  const categoryData = product.categoryData || {};

  return (
    <Card
      className="group overflow-hidden border border-gray-200 bg-white transition-shadow duration-200 hover:shadow-md"
      data-testid={`info-card-${product.id}`}
    >
      <div className="relative h-56 overflow-hidden bg-gray-100">
        <ProductVisual
          product={product}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>

      <CardHeader className="pb-2">
        {categoryData.icon && (
          <p className="mb-2 text-sm font-medium text-emerald-700">
            <span className="mr-1.5">{categoryData.icon}</span>
            {product.intelligentCategory || 'Wellness'}
          </p>
        )}
        <CardTitle className="line-clamp-2 text-xl font-bold text-gray-900">
          {product.name}
        </CardTitle>

        {product.benefitStory && (
          <p className="mt-2 line-clamp-2 text-sm text-gray-600">
            {product.benefitStory}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {visibleIngredients.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <Leaf className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
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

        {healthBenefits.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
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

        {product.variations && product.variations.length > 0 && (
          <div className="flex items-center gap-2 border-t border-gray-100 pt-2">
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
