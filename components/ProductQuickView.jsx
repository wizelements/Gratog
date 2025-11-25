'use client';

import { useState } from 'react';
<<<<<<< HEAD
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
=======
import { X, ShoppingCart, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { addToCart } from '@/lib/cart-engine';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 🔍 Product Quick View Modal - Now using unified cart-engine
 */
export default function ProductQuickView({ product, isOpen, onClose }) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);

  if (!isOpen || !product) return null;

  const handleAddToCart = async () => {
    setIsAdding(true);

    try {
      addToCart(product, quantity);
      
      setAdded(true);
      toast.success(`Added ${quantity} ${product.name} to cart`, {
        description: 'View cart to checkout',
        action: {
          label: 'View Cart',
          onClick: () => {
            onClose();
            window.dispatchEvent(new Event('openCart'));
          },
        },
      });

      setTimeout(() => {
        setAdded(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Add to cart error:', error);
      toast.error('Failed to add item to cart');
>>>>>>> upstream/main
    } finally {
      setIsAdding(false);
    }
  };

  return (
<<<<<<< HEAD
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
=======
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative p-8">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Product Image */}
              <div className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-emerald-100 to-teal-100">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Sparkles className="h-24 w-24 text-emerald-600" />
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="flex flex-col">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {product.name}
                </h2>
                {product.category && (
                  <p className="text-sm text-emerald-600 mb-4">
                    {product.category}
                  </p>
                )}
                <p className="text-4xl font-bold text-emerald-600 mb-6">
                  ${product.price.toFixed(2)}
                </p>

                {product.description && (
                  <p className="text-gray-600 mb-6">
                    {product.description}
                  </p>
                )}

                {/* Quantity Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      variant="outline"
                      size="icon"
                    >
                      -
                    </Button>
                    <span className="w-12 text-center font-semibold text-lg">
                      {quantity}
                    </span>
                    <Button
                      onClick={() => setQuantity(quantity + 1)}
                      variant="outline"
                      size="icon"
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Add to Cart Button */}
                <Button
                  onClick={handleAddToCart}
                  disabled={isAdding || added}
                  className="w-full h-14 text-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                >
                  {isAdding ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                      Adding to Cart...
                    </>
                  ) : added ? (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Added to Cart!
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Add {quantity} to Cart
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
>>>>>>> upstream/main
  );
}
