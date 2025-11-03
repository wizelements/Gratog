'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { ShoppingCart, Star, Leaf, Sparkles, Eye } from 'lucide-react';
import Link from 'next/link';
import QuickAddButton from './QuickAddButton';
import { QuickViewButton } from './ProductQuickView';

export default function ProductCard({ product, onCheckout, variant = 'default' }) {
  const [imageError, setImageError] = useState(false);
  
  const fallbackImage = 'https://images.unsplash.com/photo-1559858874-f40995981a23?w=400&h=300&fit=crop';
  
  return (
    <Card 
      className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
      data-testid={`product-card-${product.id}`}
      data-product={product.id}
    >
      <div className="relative h-64 overflow-hidden bg-gray-100">
        <Link href={`/product/${product.slug || product.id}`}>
          <Image
            src={imageError ? fallbackImage : (product.image || fallbackImage)}
            alt={`${product.name} - Premium wildcrafted sea moss product from Taste of Gratitude`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            onError={() => setImageError(true)}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </Link>
        
        {/* Quick Action Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
          <QuickViewButton product={product} className="bg-white hover:bg-gray-100" />
          <QuickAddButton product={product} variant="icon" />
        </div>
        
        {product.featured && (
          <Badge 
            className="absolute top-3 right-3 bg-[#D4AF37] text-white border-none"
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
              className="text-xs border-[#D4AF37] text-[#D4AF37] shrink-0"
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
          <span className="text-2xl font-bold text-[#D4AF37]">${product.price.toFixed(2)}</span>
          {product.size && (
            <span className="text-sm text-muted-foreground">/ {product.size}</span>
          )}
        </div>
        
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
            className="flex-1 bg-[#D4AF37] hover:bg-[#B8941F]"
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
        
        {product.squareProductUrl && (
          <Button
            onClick={() => window.open(product.squareProductUrl, '_blank')}
            variant="secondary"
            size="sm"
            className="w-full text-xs"
            data-testid={`buy-on-square-${product.id}`}
          >
            Or Buy Directly on Square →
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
