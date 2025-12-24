'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { ShoppingCart, Star } from 'lucide-react';
import { addToCart } from '@/lib/cart-engine';
import { toast } from 'sonner';
import Link from 'next/link';

export default function QuickViewModal({ product, isOpen, onClose }) {
  // Normalize variations from different possible product structures
  const normalizedVariations = useMemo(() => {
    if (!product) return [];
    
    // If product already has variations array, use it
    if (product.variations && Array.isArray(product.variations) && product.variations.length > 0) {
      return product.variations.filter(v => v.price && v.price > 0);
    }
    
    // Otherwise, construct variations from priceMini/price and sizes
    const variations = [];
    
    // If has priceMini and sizes, create variations
    if (product.priceMini && product.sizes && Array.isArray(product.sizes)) {
      variations.push({
        id: `${product.id}-mini`,
        name: product.sizes[0] || '4oz',
        price: product.priceMini
      });
      if (product.price && product.price !== product.priceMini) {
        variations.push({
          id: `${product.id}-regular`,
          name: product.sizes[1] || '16oz',
          price: product.price
        });
      }
    } else if (product.price) {
      // Single variation
      variations.push({
        id: product.id,
        name: product.size || 'Regular',
        price: product.price
      });
    }
    
    return variations.filter(v => v.price > 0);
  }, [product]);

  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState(
    normalizedVariations[0] || null
  );
  const [isAdding, setIsAdding] = useState(false);
  const sizeButtonsRef = useRef([]);

  const handleSizeKeyDown = useCallback((e, index) => {
    const buttons = sizeButtonsRef.current.filter(Boolean);
    if (!buttons.length) return;

    let nextIndex = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (index + 1) % buttons.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (index - 1 + buttons.length) % buttons.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = buttons.length - 1;
    } else {
      return;
    }

    buttons[nextIndex]?.focus();
    setSelectedVariation(normalizedVariations[nextIndex]);
  }, [normalizedVariations]);

  if (!product) return null;

  const currentPrice = selectedVariation?.price || product.price || 0;

  const handleAddToCart = () => {
    setIsAdding(true);
    
    // Use the new cartUtils with variant object
    addToCart(product, quantity, selectedVariation);
    
    toast.success(`Added ${quantity}x ${product.name} to cart!`, {
      description: selectedVariation ? `Size: ${selectedVariation.name}` : undefined,
      action: {
        label: 'View Cart',
        onClick: () => {
          window.dispatchEvent(new CustomEvent('openCart'));
          onClose();
        }
      }
    });
    
    setTimeout(() => {
      setIsAdding(false);
      setQuantity(1);
      onClose();
    }, 1500);
  };

  // Get best available image
  const getProductImage = () => {
    if (product.images?.length > 0 && product.images[0] && !product.images[0].startsWith('data:')) {
      return product.images[0];
    }
    if (product.image && !product.image.startsWith('data:image/svg')) {
      return product.image;
    }
    return '/images/sea-moss-default.svg';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">{product.name}</DialogTitle>
          <DialogDescription className="sr-only">
            Quick view for {product.name}. Price: ${currentPrice.toFixed(2)}. Use arrow keys to navigate size options.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Image */}
          <div>
            <div className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 group">
              <Image
                src={getProductImage()}
                alt={product.name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
              
              {product.ingredientIcons && product.ingredientIcons.length > 0 && (
                <div className="absolute top-3 left-3 flex gap-1">
                  {product.ingredientIcons.slice(0, 4).map((icon, idx) => (
                    <div 
                      key={idx}
                      className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-xl shadow-md"
                    >
                      {icon}
                    </div>
                  ))}
                </div>
              )}
              
              {product.intelligentCategory && (
                <Badge className="absolute top-3 right-3 bg-emerald-600">
                  {product.categoryData?.icon} {product.intelligentCategory}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Right: Details */}
          <div>
            <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
            
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">4.8 (124)</span>
            </div>
            
            <div className="text-3xl font-bold text-emerald-600 mb-4">
              ${currentPrice.toFixed(2)}
            </div>
            
            {product.benefitStory && (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700">{product.benefitStory}</p>
              </div>
            )}
            
            {product.ingredients && product.ingredients.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">Key Ingredients:</h3>
                <div className="flex flex-wrap gap-2">
                  {product.ingredients.slice(0, 4).map((ing, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-emerald-50 text-emerald-700">
                      {ing.icon} {ing.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {normalizedVariations && normalizedVariations.length > 1 && (
              <div className="mb-4">
                <label id="size-label" className="block text-sm font-semibold mb-2">Select Size</label>
                <div 
                  className="flex gap-2 flex-wrap" 
                  role="radiogroup" 
                  aria-labelledby="size-label"
                >
                  {normalizedVariations.map((variation, index) => (
                      <button
                        type="button"
                        key={variation.id}
                        ref={(el) => (sizeButtonsRef.current[index] = el)}
                        onClick={() => setSelectedVariation(variation)}
                        onKeyDown={(e) => handleSizeKeyDown(e, index)}
                        role="radio"
                        aria-checked={selectedVariation?.id === variation.id}
                        tabIndex={selectedVariation?.id === variation.id ? 0 : -1}
                        className={`px-4 py-2 border-2 rounded-lg transition-all text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                          selectedVariation?.id === variation.id
                            ? 'border-emerald-600 bg-emerald-50 font-semibold'
                            : 'border-gray-200 hover:border-emerald-300'
                        }`}
                      >
                        <div>{variation.name}</div>
                        <div className="text-xs text-emerald-600">${variation.price.toFixed(2)}</div>
                      </button>
                    ))}
                </div>
              </div>
            )}
            
            <div className="mb-6">
              <label id="quantity-label" className="block text-sm font-semibold mb-2">Quantity</label>
              <div className="flex items-center gap-4">
                <div className="flex items-center border-2 border-gray-200 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    aria-label="Decrease quantity"
                    className="px-3 py-2 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset rounded-l-md"
                  >
                    -
                  </button>
                  <span className="px-4 font-semibold" aria-live="polite" aria-labelledby="quantity-label">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    aria-label="Increase quantity"
                    className="px-3 py-2 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset rounded-r-md"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-muted-foreground">
                  Subtotal: ${(currentPrice * quantity).toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={handleAddToCart}
                disabled={isAdding}
                autoFocus
                className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                {isAdding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Adding...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Add to Cart
                  </>
                )}
              </Button>
              
              <Link href={`/product/${product.slug || product.id}`} className="block">
                <Button variant="outline" className="w-full focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2" onClick={onClose}>
                  View Full Details
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
