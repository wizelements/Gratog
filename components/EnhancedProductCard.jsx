'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { ShoppingCart, Star, Sparkles, Info, Eye } from 'lucide-react';
import Link from 'next/link';
import QuickAddButton from './QuickAddButton';
import QuickViewModal from './QuickViewModal';
import VariantSelector from './VariantSelector';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function EnhancedProductCard({ product, onCheckout, variant = 'default' }) {
  const [imageError, setImageError] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  
  const fallbackImage = '/images/sea-moss-default.svg';
  const hasIngredientData = product.ingredients && product.ingredients.length > 0;
  
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
  
  // Get category color class
  const getCategoryColor = () => {
    const colorMap = {
      'emerald': 'bg-emerald-100 text-emerald-800 border-emerald-300',
      'yellow': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'orange': 'bg-orange-100 text-orange-800 border-orange-300',
      'purple': 'bg-purple-100 text-purple-800 border-purple-300',
      'teal': 'bg-teal-100 text-teal-800 border-teal-300'
    };
    
    const color = product.categoryData?.color || 'emerald';
    return colorMap[color] || colorMap.emerald;
  };
  
  return (
    <Card 
      className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2"
      data-testid={`enhanced-product-card-${product.id}`}
      data-product={product.id}
    >
      <Link href={`/product/${product.slug || product.id}`}>
        <div className="relative h-64 overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50">
          {product.image || product.images?.[0] ? (
            <Image
              src={imageError ? fallbackImage : (product.image || product.images[0])}
              alt={`${product.name} - ${product.benefitStory || 'Premium wellness product'}`}
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
          
          {/* Ingredient Icons Overlay */}
          {hasIngredientData && product.ingredientIcons && (
            <div className="absolute top-3 left-3 flex gap-1">
              {product.ingredientIcons.slice(0, 4).map((icon, idx) => (
                <div 
                  key={idx}
                  className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-lg shadow-sm"
                  title={product.ingredients[idx]?.name}
                >
                  {icon}
                </div>
              ))}
              {product.ingredientIcons.length > 4 && (
                <div className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-xs font-semibold text-emerald-600 shadow-sm">
                  +{product.ingredientIcons.length - 4}
                </div>
              )}
            </div>
          )}
          
          {/* Category Badge */}
          {product.intelligentCategory && (
            <Badge 
              className={`absolute top-3 right-3 ${getCategoryColor()} border`}
            >
              {product.categoryData?.icon} {product.intelligentCategory}
            </Badge>
          )}
          
          {product.featured && (
            <Badge 
              className="absolute bottom-3 left-3 bg-yellow-500 text-white border-none"
              data-testid="featured-badge"
            >
              <Star className="h-3 w-3 mr-1 fill-white" />
              Featured
            </Badge>
          )}
        </div>
      </Link>
      
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2 group-hover:text-emerald-600 transition-colors">
              {product.name}
            </CardTitle>
            
            {/* Benefit Story (if available) */}
            {product.benefitStory && (
              <CardDescription className="mt-2 text-sm line-clamp-2">
                {product.benefitStory}
              </CardDescription>
            )}
            
            {!product.benefitStory && product.description && (
              <CardDescription className="mt-1 line-clamp-1">{product.description}</CardDescription>
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
        
        {/* Ingredient Benefits Tags */}
        {hasIngredientData && product.ingredients.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            <TooltipProvider>
              {product.ingredients.slice(0, 3).map((ingredient, idx) => (
                <Tooltip key={idx}>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="secondary" 
                      className="text-xs cursor-help bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    >
                      {ingredient.icon} {ingredient.name}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs font-semibold">Benefits:</p>
                    <ul className="text-xs list-disc list-inside">
                      {ingredient.benefits.map((benefit, bidx) => (
                        <li key={bidx}>{benefit}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              ))}
              {product.ingredients.length > 3 && (
                <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700">
                  +{product.ingredients.length - 3} more
                </Badge>
              )}
            </TooltipProvider>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-bold text-emerald-600">
            ${typeof displayPrice === 'number' ? displayPrice.toFixed(2) : '0.00'}
          </span>
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
        
        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.tags.slice(0, 4).map((tag, idx) => (
              <span 
                key={idx}
                className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col gap-2">
        <div className="flex gap-2 w-full">
          <QuickAddButton 
            product={product}
            selectedVariant={selectedVariant || product.variations?.[0]}
            className="flex-1"
          />
          
          <Button
            onClick={() => setShowQuickView(true)}
            variant="outline"
            className="flex-1 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          >
            <Eye className="mr-2 h-4 w-4" />
            Quick View
          </Button>
        </div>
        
        <Link href={`/product/${product.slug || product.id}`} className="w-full">
          <Button 
            variant="ghost" 
            size="sm"
            className="w-full text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
            data-testid={`view-details-${product.id}`}
          >
            <Info className="mr-2 h-3 w-3" />
            Full Details
          </Button>
        </Link>
      </CardFooter>
      
      {/* Quick View Modal */}
      <QuickViewModal 
        product={product}
        isOpen={showQuickView}
        onClose={() => setShowQuickView(false)}
      />
    </Card>
  );
}
