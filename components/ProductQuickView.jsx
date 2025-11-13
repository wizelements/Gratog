'use client';

import { useState } from 'react';
import { X, ShoppingCart, Star, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { addToCart } from '@/lib/cartUtils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ProductQuickView');

export default function ProductQuickView({ product, isOpen, onClose }) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  if (!product) return null;

  const handleAddToCart = async () => {
    setIsAdding(true);
    logger.info('Adding product to cart from quick view', { 
      productId: product.id, 
      quantity 
    });

    try {
      const productToAdd = {
        ...product,
        quantity,
        variationId: product.variationId || product.catalogObjectId || product.id,
      };

      for (let i = 0; i < quantity; i++) {
        addToCart(productToAdd);
      }

      logger.info('Product added successfully', { productId: product.id, quantity });
      
      // Dispatch cart update event
      if (typeof window !== 'undefined') {
        const cart = JSON.parse(localStorage.getItem('tog_cart') || '{"items":[]}');
        window.dispatchEvent(new CustomEvent('cartUpdated', {
          detail: { cart: cart.items || [] }
        }));
      }

      toast.success(`${product.name} added to cart! 🎉`);
      onClose();
    } catch (error) {
      logger.error('Failed to add product', { error: error.message });
      toast.error('Failed to add to cart');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{product.name}</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          {/* Image */}
          <div className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-emerald-100 to-teal-100">
            {product.image || product.images?.[0] ? (
              <img
                src={product.image || product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Sparkles className="h-20 w-20 text-emerald-600" />
              </div>
            )}

            {product.badge && (
              <Badge className="absolute top-4 left-4 bg-emerald-600 text-white">
                {product.badge}
              </Badge>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            {product.category && (
              <Badge variant="outline" className="w-fit mb-3 border-emerald-600 text-emerald-600">
                {product.category}
              </Badge>
            )}

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-bold text-emerald-600">
                ${typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'}
              </span>
              {product.size && (
                <span className="text-gray-600">/ {product.size}</span>
              )}
            </div>

            {product.description && (
              <p className="text-gray-700 mb-4">{product.description}</p>
            )}

            {product.benefits && product.benefits.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Benefits:</h4>
                <ul className="space-y-1">
                  {product.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                      <Star className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {product.ingredients && (
              <div className="mb-4 text-sm">
                <h4 className="font-semibold mb-1">Ingredients:</h4>
                <p className="text-gray-600">{product.ingredients.join(', ')}</p>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Quantity</label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <span className="w-12 text-center font-semibold">{quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </Button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button
              onClick={handleAddToCart}
              disabled={isAdding}
              className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700"
            >
              {isAdding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Add to Cart - ${(product.price * quantity).toFixed(2)}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
