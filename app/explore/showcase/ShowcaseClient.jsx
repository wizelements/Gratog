'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Sparkles, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// Category configuration
const CATEGORIES = [
  { key: 'sea-moss', label: 'Sea Moss Gels', emoji: '🌿', gradient: 'from-emerald-500 to-teal-600' },
  { key: 'lemonades', label: 'Lemonades', emoji: '🍋', gradient: 'from-yellow-400 to-orange-500' },
  { key: 'juices', label: 'Fresh Juices', emoji: '🧃', gradient: 'from-green-400 to-emerald-500' },
  { key: 'refreshers', label: 'Refreshers', emoji: '🍹', gradient: 'from-cyan-400 to-blue-500' },
  { key: 'boba', label: 'Boba Teas', emoji: '🧋', gradient: 'from-purple-400 to-pink-500' },
  { key: 'shots', label: 'Wellness Shots', emoji: '🥃', gradient: 'from-amber-400 to-red-500' },
];

function getCategoryFromProduct(product) {
  const name = (product.name || '').toLowerCase();
  const category = (product.category || product.categoryData?.name || product.intelligentCategory || '').toLowerCase();
  
  if (category.includes('moss') || category.includes('gel')) return 'sea-moss';
  if (category.includes('lemonade')) return 'lemonades';
  if (category.includes('juice')) return 'juices';
  if (category.includes('refresher')) return 'refreshers';
  if (category.includes('boba')) return 'boba';
  if (category.includes('shot')) return 'shots';
  if (name.includes('lemonade')) return 'lemonades';
  if (name.includes('juice')) return 'juices';
  if (name.includes('refresher')) return 'refreshers';
  if (name.includes('boba')) return 'boba';
  if (name.includes('shot')) return 'shots';
  if (name.includes('moss') || name.includes('gel')) return 'sea-moss';
  return null;
}

function ProductCard({ product }) {
  const hasImage = product.images?.[0] || product.image;
  
  return (
    <Link href={`/product/${product.id}`}>
      <Card className="flex-shrink-0 w-48 bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden">
        <div className="relative h-48 bg-gradient-to-br from-emerald-50 to-teal-50">
          {hasImage ? (
            <Image
              src={product.images?.[0] || product.image}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl">{product.emoji || '🫙'}</span>
            </div>
          )}
          <div className="absolute top-2 right-2">
            <Badge className="bg-black/70 text-white border-0 text-xs">
              {product.priceFormatted}
            </Badge>
          </div>
        </div>
        
        <CardContent className="p-3">
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-tight">
            {product.name}
          </h3>
          {product.size && (
            <p className="text-xs text-gray-500 mt-1">{product.size}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ShowcaseClient({ initialProducts = [] }) {
  // Process products
  const products = useMemo(() => {
    return initialProducts.map(p => ({
      ...p,
      category: getCategoryFromProduct(p),
      priceFormatted: typeof p.price === 'number' ? `$${p.price.toFixed(2)}` : p.price,
    }));
  }, [initialProducts]);

  // Group by category
  const productsByCategory = useMemo(() => {
    const grouped = {};
    CATEGORIES.forEach(cat => {
      const catProducts = products.filter(p => p.category === cat.key);
      if (catProducts.length > 0) {
        grouped[cat.key] = {
          ...cat,
          products: catProducts
        };
      }
    });
    return grouped;
  }, [products]);

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900">
        <div className="container mx-auto px-4 py-8">
          <Link href="/explore">
            <Button variant="ghost" className="mb-4 text-white/80 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="text-center py-20">
            <ShoppingBag className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Products Available</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-b from-emerald-900/95 to-transparent backdrop-blur-sm pb-4">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/explore">
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </Link>
            
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="text-white font-semibold">Showcase</span>
            </div>
            
            <Link href="/catalog">
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-white">
                <ShoppingBag className="w-4 h-4 mr-1" />
                Shop
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Product Rows by Category */}
      <div className="container mx-auto px-4 pb-12 space-y-8">
        {Object.values(productsByCategory).map((section) => (
          <div key={section.key}>
            {/* Section Header */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{section.emoji}</span>
              <h2 className={`text-xl font-bold bg-gradient-to-r ${section.gradient} bg-clip-text text-transparent`}>
                {section.label}
              </h2>
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                {section.products.length}
              </Badge>
            </div>
            
            {/* Horizontal Scroll Row */}
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-4 pb-4">
                {section.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </div>
        ))}
        
        {/* Footer */}
        <div className="text-center pt-8 pb-4">
          <p className="text-white/50 text-sm">
            ✨ Premium Wellness Products ✨
          </p>
        </div>
      </div>
    </div>
  );
}
