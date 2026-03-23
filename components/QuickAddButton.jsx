'use client';

import { useState } from 'react';
import { ShoppingCart, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { addToCart } from '@/lib/cart-engine';
import { getAddToCartLabel, getAddedToCartMessage } from '@/lib/purchase-status';
import { motion } from 'framer-motion';

/**
 * ⚡ Quick Add Button - Now using unified cart-engine with proper variant support
 */
export default function QuickAddButton({ product, selectedVariant, variant = 'default', className = '' }) {
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const isPreorder = product?.stock != null && product.stock <= 0;
  const purchaseStatus = isPreorder ? 'preorder' : 'in_stock';

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!product) {
      toast.error('Product information missing');
      return;
    }

    setIsAdding(true);

    try {
      // Pass selectedVariant as third parameter to addToCart
      addToCart(product, 1, selectedVariant);
      
      setAdded(true);
      
      const variantText = selectedVariant ? ` (Size: ${selectedVariant.name})` : '';
      toast.success(getAddedToCartMessage(product.name, purchaseStatus, variantText), {
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
    } finally {
      setIsAdding(false);
    }
  };

  return (
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
            {getAddToCartLabel(purchaseStatus)}
          </>
        )}
      </Button>
    </motion.div>
  );
}
