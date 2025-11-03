'use client';

import { useState } from 'react';
import { X, Star, Sparkles, Shield, Truck, Heart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import QuickAddButton from './QuickAddButton';

export default function ProductQuickView({ product, isOpen, onClose }) {
  const [selectedImage, setSelectedImage] = useState(0);

  if (!isOpen || !product) return null;

  const images = product.images || [product.image];
  const benefits = product.benefits || [
    'Premium wildcrafted sea moss',
    'Rich in 92 essential minerals',
    'Supports immune health',
    'Boosts energy & vitality'
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
          {/* Close Button */}
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur-sm hover:bg-white shadow-lg rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>

          <CardContent className="p-0">
            <div className="grid md:grid-cols-2 gap-0 max-h-[90vh] overflow-y-auto">
              {/* Left: Images */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-8">
                {/* In Stock Badge */}
                <div className="mb-4">
                  <Badge className="bg-green-600 text-white">
                    <Sparkles className="h-3 w-3 mr-1" />
                    In Stock - Fast Shipping
                  </Badge>
                </div>

                {/* Main Image */}
                <div className="relative aspect-square bg-white rounded-2xl overflow-hidden mb-4 shadow-lg group">
                  {images[selectedImage] ? (
                    <img
                      src={images[selectedImage]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100">
                      <Sparkles className="h-24 w-24 text-emerald-600" />
                    </div>
                  )}
                  
                  {/* Wishlist Button */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm hover:bg-white shadow-md rounded-full"
                  >
                    <Heart className="h-5 w-5" />
                  </Button>
                </div>

                {/* Thumbnail Gallery */}
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                          selectedImage === index 
                            ? 'border-emerald-600 scale-105' 
                            : 'border-transparent hover:border-emerald-300'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${product.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Trust Badges */}
                <div className="grid grid-cols-3 gap-3 mt-6">
                  <div className="flex flex-col items-center gap-1 p-3 bg-white rounded-lg">
                    <Shield className="h-6 w-6 text-emerald-600" />
                    <span className="text-xs font-medium text-gray-700">100% Natural</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-3 bg-white rounded-lg">
                    <Truck className="h-6 w-6 text-emerald-600" />
                    <span className="text-xs font-medium text-gray-700">Fast Ship</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-3 bg-white rounded-lg">
                    <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-medium text-gray-700">Top Rated</span>
                  </div>
                </div>
              </div>

              {/* Right: Details */}
              <div className="p-8 flex flex-col">
                {/* Category */}
                <Badge variant="outline" className="w-fit mb-3">
                  {product.category === 'gel' ? 'Sea Moss Gel' : 
                   product.category === 'lemonade' ? 'Lemonade' :
                   product.category === 'shot' ? 'Wellness Shot' :
                   'Premium Product'}
                </Badge>

                {/* Product Name */}
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {product.name}
                </h2>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 text-yellow-500 fill-yellow-500"
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">(127 reviews)</span>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-bold text-emerald-600">
                      ${product.price.toFixed(2)}
                    </span>
                    {product.originalPrice && (
                      <span className="text-xl text-gray-400 line-through">
                        ${product.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Free shipping on orders over $60
                  </p>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <p className="text-gray-700 leading-relaxed">
                    {product.description || `Premium ${product.name} - hand-crafted with wildcrafted sea moss for maximum potency and health benefits.`}
                  </p>
                </div>

                {/* Benefits */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Key Benefits</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {benefits.map((benefit, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="mt-0.5">
                          <Sparkles className="h-4 w-4 text-emerald-600" />
                        </div>
                        <span className="text-sm text-gray-700">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Action Buttons */}
                <div className="space-y-3 pt-6 border-t border-gray-200">
                  <QuickAddButton 
                    product={product}
                    className="w-full h-12 text-lg shadow-lg"
                  />
                  
                  <Button
                    onClick={() => window.location.href = `/product/${product.slug || product.id}`}
                    variant="outline"
                    className="w-full h-12 border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                  >
                    <Eye className="mr-2 h-5 w-5" />
                    View Full Details
                  </Button>
                </div>

                {/* Guarantee */}
                <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
                  <p className="text-xs text-emerald-900 text-center">
                    🛡️ 30-Day Money Back Guarantee • 🌟 Premium Quality • 🚚 Free Returns
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// Quick View Trigger Button
export function QuickViewButton({ product, className = '' }) {
  const [showQuickView, setShowQuickView] = useState(false);

  return (
    <>
      <Button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowQuickView(true);
        }}
        variant="outline"
        size="icon"
        className={`${className} border-emerald-600 text-emerald-600 hover:bg-emerald-50`}
      >
        <Eye className="h-5 w-5" />
      </Button>

      <ProductQuickView
        product={product}
        isOpen={showQuickView}
        onClose={() => setShowQuickView(false)}
      />
    </>
  );
}
