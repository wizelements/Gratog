'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Box, Smartphone, ArrowLeft, Sparkles, Rotate3d, Plus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// Category order matching the shop/catalog
const CATEGORY_ORDER = [
  { key: 'sea-moss', label: 'Sea Moss Gels', emoji: '🌿' },
  { key: 'lemonades', label: 'Lemonades', emoji: '🍋' },
  { key: 'juices', label: 'Fresh Juices', emoji: '🧃' },
  { key: 'refreshers', label: 'Refreshers', emoji: '🍹' },
  { key: 'boba', label: 'Boba Teas', emoji: '🧋' },
  { key: 'shots', label: 'Wellness Shots', emoji: '🥃' },
  { key: 'specials', label: 'Specials', emoji: '✨' },
];

// Use the same category resolution as catalog
function resolveCategoryAlias(category) {
  const normalized = (category || '').toLowerCase().trim();
  const aliases = {
    'moss gel': 'sea-moss',
    'gel': 'sea-moss',
    'sea moss': 'sea-moss',
    'seamoss': 'sea-moss',
    'lemonade': 'lemonades',
    'juice': 'juices',
    'fresh juice': 'juices',
    'refresher': 'refreshers',
    'boba': 'boba',
    'bubble tea': 'boba',
    'shot': 'shots',
    'wellness shot': 'shots',
  };
  return aliases[normalized] || normalized || 'specials';
}

function getCategoryFromProduct(product) {
  // First check explicit category fields
  if (product.category) {
    const resolved = resolveCategoryAlias(product.category);
    if (resolved !== 'specials') return resolved;
  }
  if (product.categoryData?.name) {
    const resolved = resolveCategoryAlias(product.categoryData.name);
    if (resolved !== 'specials') return resolved;
  }
  if (product.intelligentCategory) {
    const resolved = resolveCategoryAlias(product.intelligentCategory);
    if (resolved !== 'specials') return resolved;
  }
  
  // Fall back to name-based detection
  const name = (product.name || '').toLowerCase();
  if (name.includes('lemonade')) return 'lemonades';
  if (name.includes('juice')) return 'juices';
  if (name.includes('refresher')) return 'refreshers';
  if (name.includes('boba') || name.includes('bubble')) return 'boba';
  if (name.includes('shot')) return 'shots';
  if (name.includes('moss') || name.includes('gel')) return 'sea-moss';
  
  return 'specials';
}

function getCategoryEmoji(category) {
  const cat = CATEGORY_ORDER.find(c => c.key === category);
  return cat?.emoji || '✨';
}

function getCategoryLabel(category) {
  const cat = CATEGORY_ORDER.find(c => c.key === category);
  return cat?.label || category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export default function ShowcaseClient({ initialProducts = [], initialCategories = [] }) {
  const [selectedProduct, setSelectedProduct] = useState(initialProducts[0] || null);
  const [rotation, setRotation] = useState(0);
  const [activeCategory, setActiveCategory] = useState('all');

  // Transform products with categories - same as catalog page
  const products = useMemo(() => {
    return initialProducts.map(p => ({
      ...p,
      category: getCategoryFromProduct(p),
      priceFormatted: p.price ? `$${p.price.toFixed(2)}` : '$0.00',
    }));
  }, [initialProducts]);

  // Filter products by category
  const filteredProducts = useMemo(() => {
    if (activeCategory === 'all') return products;
    return products.filter(p => p.category === activeCategory);
  }, [products, activeCategory]);

  // Get available categories from actual products
  const availableCategories = useMemo(() => {
    const usedCategories = new Set(products.map(p => p.category));
    return CATEGORY_ORDER.filter(cat => usedCategories.has(cat.key));
  }, [products]);

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <Link href="/explore">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Explore
            </Button>
          </Link>

          <div className="text-center py-20">
            <Box className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">No Products Available</h2>
            <p className="text-gray-500">Check back soon for our wellness product showcase!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <Link href="/explore">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Explore
          </Button>
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            3D Product Showcase
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Interactive product visualization experience
          </p>
        </div>

        {/* Category Tabs - Same as catalog */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <Button
            variant={activeCategory === 'all' ? 'default' : 'outline'}
            onClick={() => { setActiveCategory('all'); setSelectedProduct(products[0]); }}
            className={activeCategory === 'all' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-emerald-300 text-emerald-700'}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            All Products ({products.length})
          </Button>
          {availableCategories.map((cat) => {
            const count = products.filter(p => p.category === cat.key).length;
            return (
              <Button
                key={cat.key}
                variant={activeCategory === cat.key ? 'default' : 'outline'}
                onClick={() => {
                  setActiveCategory(cat.key);
                  const firstInCat = products.find(p => p.category === cat.key);
                  if (firstInCat) setSelectedProduct(firstInCat);
                }}
                className={activeCategory === cat.key ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-emerald-300 text-emerald-700'}
              >
                <span className="mr-2">{cat.emoji}</span>
                {cat.label} ({count})
              </Button>
            );
          })}
        </div>

        {/* Product Selector - Horizontal scroll */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex gap-4 pb-4 min-w-max justify-center">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className={`flex-shrink-0 w-36 p-4 rounded-xl border-2 transition-all text-left ${
                  selectedProduct?.id === product.id
                    ? 'border-emerald-500 bg-emerald-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-emerald-300'
                }`}
              >
                <div className="text-4xl mb-2 text-center">{product.emoji || '🫙'}</div>
                <p className="text-sm font-medium text-gray-900 line-clamp-2 text-center">{product.name}</p>
                <p className="text-xs text-emerald-600 text-center mt-1">{product.priceFormatted}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* 3D Viewer */}
          <div>
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative min-h-[500px] bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
                  {selectedProduct?.images?.[0] || selectedProduct?.image ? (
                    <div 
                      className="relative w-72 h-72 transition-transform duration-300 ease-out"
                      style={{ transform: `rotateY(${rotation}deg)` }}
                    >
                      <Image
                        src={selectedProduct.images?.[0] || selectedProduct.image}
                        alt={selectedProduct.name}
                        fill
                        className="object-contain drop-shadow-2xl"
                      />
                    </div>
                  ) : (
                    <div 
                      className="relative w-72 h-72 transition-transform duration-300 ease-out"
                      style={{ transform: `rotateY(${rotation}deg)` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-200/50 to-teal-300/50 rounded-2xl shadow-2xl flex items-center justify-center">
                        <div className="text-center p-6">
                          <div className="text-8xl mb-4">{selectedProduct?.emoji || '🫙'}</div>
                          <h3 className="text-xl font-bold text-emerald-800">{selectedProduct?.name}</h3>
                          <p className="text-emerald-600 mt-2">{selectedProduct?.priceFormatted}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Rotation Controls */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => setRotation(r => r - 45)}
                      className="bg-white/80 backdrop-blur"
                    >
                      <Rotate3d className="w-4 h-4 mr-1" />
                      Rotate Left
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => setRotation(r => r + 45)}
                      className="bg-white/80 backdrop-blur"
                    >
                      Rotate Right
                      <Rotate3d className="w-4 h-4 ml-1 scale-x-[-1]" />
                    </Button>
                  </div>
                  
                  {/* Category Badge */}
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-amber-500 text-white">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {getCategoryEmoji(selectedProduct?.category)} {getCategoryLabel(selectedProduct?.category)}
                    </Badge>
                  </div>
                </div>
                
                <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-t">
                  <div className="flex items-center gap-3 text-purple-700">
                    <Sparkles className="w-5 h-5" />
                    <div>
                      <p className="font-semibold">Full 3D & AR Coming Soon!</p>
                      <p className="text-sm text-purple-600">Interactive 3D models with AR placement</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{selectedProduct?.emoji || '🫙'}</span>
                  <CardTitle className="text-3xl">{selectedProduct?.name}</CardTitle>
                </div>
                <Badge variant="secondary" className="w-fit">
                  {getCategoryEmoji(selectedProduct?.category)} {getCategoryLabel(selectedProduct?.category)}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-gray-600 text-lg mb-4">{selectedProduct?.description || selectedProduct?.shortDescription || 'Premium wellness product'}</p>
                  <p className="text-4xl font-bold text-emerald-600">{selectedProduct?.priceFormatted}</p>
                </div>

                {selectedProduct?.benefits?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Key Benefits</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.benefits.map((benefit) => (
                        <Badge key={benefit} variant="secondary" className="text-sm px-3 py-1">
                          {benefit}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <Link href={`/product/${selectedProduct?.id}`}>
                    <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-lg py-6">
                      <Plus className="w-5 h-5 mr-2" />
                      View Product Details
                    </Button>
                  </Link>
                  <Link href="/catalog">
                    <Button variant="outline" className="w-full text-lg py-6">
                      Browse Full Catalog
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* AR Instructions */}
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                  How to Use AR
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">1.</span>
                    <span>Switch to the "AR View" tab</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">2.</span>
                    <span>Tap the AR button on the 3D model</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">3.</span>
                    <span>Point your camera at a flat surface</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">4.</span>
                    <span>Tap to place the product in your space!</span>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
