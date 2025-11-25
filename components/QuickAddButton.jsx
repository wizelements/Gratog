'use client';

import { useState } from 'react';
<<<<<<< HEAD
import { ShoppingCart, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { addToCart } from '@/lib/cartUtils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('QuickAddButton');

export default function QuickAddButton({ product, size = 'default', className = '' }) {
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
=======
import { ShoppingCart, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { addToCart } from '@/lib/cart-engine';
import { motion } from 'framer-motion';

/**
 * ⚡ Quick Add Button - Now using unified cart-engine with proper variant support
 */
export default function QuickAddButton({ product, selectedVariant, variant = 'default', className = '' }) {
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
>>>>>>> upstream/main

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

<<<<<<< HEAD
    if (isAdding || justAdded) return;

    logger.info('Adding product to cart', { 
      productId: product.id, 
      productName: product.name,
      price: product.price 
    });
=======
    if (!product) {
      toast.error('Product information missing');
      return;
    }
>>>>>>> upstream/main

    setIsAdding(true);

    try {
<<<<<<< HEAD
      // Ensure product has required fields
      const productToAdd = {
        id: product.id,
        name: product.name,
        price: product.price,
        priceCents: product.priceCents,
        image: product.image || product.images?.[0],
        category: product.category,
        slug: product.slug,
        variationId: product.variationId || product.catalogObjectId || product.id,
      };

      logger.debug('Product data prepared', productToAdd);

      const updatedCart = addToCart(productToAdd);
      
      logger.info('Product added to cart successfully', { 
        cartSize: updatedCart.length,
        productId: product.id 
      });

      // Dispatch cart update event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cartUpdated', {
          detail: { cart: updatedCart }
        }));
        logger.debug('Cart updated event dispatched');
      }

      setJustAdded(true);
      toast.success(`${product.name} added to cart! 🎉`, {
        duration: 2000,
      });

      // Reset after 2 seconds
      setTimeout(() => {
        setJustAdded(false);
      }, 2000);

    } catch (error) {
      logger.error('Failed to add product to cart', { 
        error: error.message,
        productId: product.id 
      });
      toast.error('Failed to add to cart. Please try again.');
=======
      // Pass selectedVariant as third parameter to addToCart
      addToCart(product, 1, selectedVariant);
      
      setAdded(true);
      
      const variantText = selectedVariant ? ` (Size: ${selectedVariant.name})` : '';
      toast.success(`Added ${product.name}${variantText} to cart`, {
        description: 'View cart to checkout',
        action: {
          label: 'View Cart',
          onClick: () => window.dispatchEvent(new Event('openCart')),
        },
      });

      // Reset button after 2 seconds
      setTimeout(() => {
        setAdded(false);
      }, 2000);
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
    <Button
      onClick={handleAddToCart}
      disabled={isAdding || justAdded}
      size={size}
      className={`${justAdded ? 'bg-green-600 hover:bg-green-700' : 'bg-emerald-600 hover:bg-emerald-700'} transition-all ${className}`}
    >
      {justAdded ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          Added!
        </>
      ) : (
        <>
          <Plus className="mr-2 h-4 w-4" />
          Add to Cart
        </>
      )}
    </Button>
=======
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Button
        onClick={handleAddToCart}
        disabled={isAdding || added}
        variant={variant}
        className={`relative ${className}`}
      >
        {isAdding ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Adding...
          </>
        ) : added ? (
          <>
            <Check className="h-4 w-4 mr-2" />
            Added!
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </>
        )}
      </Button>
    </motion.div>
>>>>>>> upstream/main
  );
}
