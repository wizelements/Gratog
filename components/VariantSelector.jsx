'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

/**
 * VariantSelector Component
 * Displays size/variant options for products with multiple variations
 * Filters out $0 priced variants automatically
 */
export default function VariantSelector({ variations, defaultVariant, onVariantChange, className = '' }) {
  // Filter out variants with $0 price - these are likely not configured yet
  const validVariations = variations.filter(v => v.price > 0);
  
  // If no valid variants, use first variant anyway (fallback)
  const availableVariations = validVariations.length > 0 ? validVariations : variations;
  
  // Set default to first available variant or provided default
  const [selectedVariant, setSelectedVariant] = useState(
    defaultVariant || availableVariations[0]
  );

  useEffect(() => {
    // Notify parent of initial selection
    if (selectedVariant && onVariantChange) {
      onVariantChange(selectedVariant);
    }
  }, []);

  const handleVariantSelect = (variant) => {
    setSelectedVariant(variant);
    if (onVariantChange) {
      onVariantChange(variant);
    }
  };

  // Don't render if only one variant
  if (availableVariations.length <= 1) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium text-gray-700">Select Size:</label>
      <div className="flex flex-wrap gap-2">
        {availableVariations.map((variant) => {
          const isSelected = selectedVariant?.id === variant.id;
          return (
            <Button
              key={variant.id}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleVariantSelect(variant)}
              className={`relative ${
                isSelected
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                  : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              {isSelected && (
                <Check className="h-3 w-3 mr-1" />
              )}
              <span className="font-semibold">{variant.name}</span>
              {variant.price > 0 && (
                <span className="ml-1.5 text-xs opacity-90">
                  (${variant.price.toFixed(2)})
                </span>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
