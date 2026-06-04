'use client';

import { useState, useCallback } from 'react';
import { ShoppingCart, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { addToCart } from '@/lib/cart-engine';
import { getAddToCartLabel, getAddedToCartMessage } from '@/lib/purchase-status';

/**
 * ⚡ Quick Add Button - Enhanced with global loading states
 * 🎯 UX IMPROVEMENTS: Global toast feedback, prevents double-click, cart animation
 */
export default function QuickAddButton({ product, selectedVariant, variant = 'default', className = '' }) {
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const isPreorder = product?.stock != null && product.stock <= 0;
  const purchaseStatus = isPreorder ? 'preorder' : 'in_stock';

  const handleAddToCart = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!product) {
      toast.error('Product information missing');
      return;
    }

    // Prevent double-clicks
    if (isAdding || added) return;

    setIsAdding(true);

    try {
      // Create add promise for toast
      const addPromise = new Promise((resolve, reject) => {
        try {
          // Pass selectedVariant as third parameter to addToCart
          addToCart(product, 1, selectedVariant);
          resolve({ 
            name: product.name, 
            status: purchaseStatus,
            variant: selectedVariant?.name 
          });
        } catch (error) {
          reject(error);
        }
      });

      // 🎯 GLOBAL LOADING STATE: Show toast with loading, success, error states
      const variantText = selectedVariant ? ` (Size: ${selectedVariant.name})` : '';
      
      await toast.promise(
        addPromise,
        {
          loading: `Adding ${product.name}...`,
          success: (data) => ({
            message: getAddedToCartMessage(data.name, data.status, variantText),
            description: 'View cart to checkout or continue shopping',
            action: {
              label: 'View Cart',
              onClick: () => window.dispatchEvent(new Event('openCart')),
            },
          }),
          error: (err) => ({
            message: 'Failed to add item',
            description: err.message || 'Please try again',
          }),
        },
        {
          duration: 3000,
          position: 'bottom-center',
        }
      );

      // Update local button state
      setAdded(true);
      
      // 🎯 CART ANIMATION: Trigger cart open animation
      window.dispatchEvent(new CustomEvent('cartItemAdded', { 
        detail: { product: product.name } 
      }));

      // Reset button after 2 seconds
      setTimeout(() => {
        setAdded(false);
      }, 2000);
      
    } catch (error) {
      console.error('Add to cart error:', error);
      // Toast already handled by promise
    } finally {
      setIsAdding(false);
    }
  }, [product, selectedVariant, isAdding, added, purchaseStatus]);

  return (
    <Button
      onClick={handleAddToCart}
      disabled={isAdding || added}
      variant={variant}
      className={`relative ${className} ${
        added ? 'bg-emerald-600 hover:bg-emerald-700' : ''
      }`}
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
  );
}
