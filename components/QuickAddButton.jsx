'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ShoppingCart, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { addToCart } from '@/lib/cart-engine';
import { getAddToCartLabel, getAddedToCartMessage } from '@/lib/purchase-status';
import { resolveProductAvailability } from '@/lib/product-availability';

/**
 * ⚡ Quick Add Button - Enhanced with global loading states
 * 🎯 UX IMPROVEMENTS: Global toast feedback, prevents double-click, cart animation
 */
export default function QuickAddButton({ product, selectedVariant, variant = 'default', className = '' }) {
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const availability = resolveProductAvailability(product);
  // An unsupported preorder can never drop into the normal cart.
  const checkoutReady = availability.canOrder &&
    (availability.status !== 'preorder' || availability.canMarketPreorder);
  const outOfStock = availability.reason === 'out_of_stock';
  const purchaseStatus = availability.status === 'preorder' ? 'preorder' : 'in_stock';
  const requiresMarketPickup = Boolean(
    availability.status === 'preorder' ||
    product?.marketPickupOnly ||
    product?.marketExclusive ||
    product?.fulfillmentType === 'market_pickup' ||
    product?.fulfillmentType === 'market_pickup_only'
  );

  const handleAddToCart = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!product) {
      toast.error('Product information missing');
      return;
    }

    if (!checkoutReady) {
      toast.message('This item is not connected to checkout yet.', {
        description: product.checkoutUnavailableReason || 'Join the weekly menu email or ask at the market for current availability.',
      });
      return;
    }

    // Prevent double-clicks
    if (isAdding || added) return;

    setIsAdding(true);

    try {
      const result = addToCart(product, 1, selectedVariant);
      if (!result?.success) {
        throw new Error(result?.error || 'Could not add item to cart');
      }
      const variantText = selectedVariant?.name ? ` (Size: ${selectedVariant.name})` : '';
      // Sonner expects a string/React node for the message, not an object.
      // Returning { message, description, action } from toast.promise causes
      // "Objects are not valid as a React child" (React #31) on the homepage.
      toast.success(getAddedToCartMessage(product.name, purchaseStatus, variantText), {
        description: 'View cart to checkout or continue shopping',
        action: {
          label: 'View Cart',
          onClick: () => window.dispatchEvent(new Event('openCart')),
        },
        duration: 3000,
      });

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
      toast.error('Could not add item', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsAdding(false);
    }
  }, [product, selectedVariant, isAdding, added, purchaseStatus, checkoutReady]);

  if (!checkoutReady) {
    const productHref = product?.slug || product?.id ? `/product/${product.slug || product.id}` : '/catalog';

    return (
      <Button asChild variant={variant} className={`relative ${className}`}>
        <Link href={productHref}>{outOfStock ? 'Sold out' : availability.label === 'Request availability' ? 'Request availability' : 'View details'}</Link>
      </Button>
    );
  }

  if (requiresMarketPickup || availability.canMarketPreorder) {
    // Market-only products must enter the market preorder journey; writing them
    // straight into the general cart bypasses pickup selection and minimums.
    const productKey = product?.slug || product?.curatedProductId || product?.id || '';
    const href = `/preorder?product=${encodeURIComponent(productKey)}&utm_source=homepage_product`;
    return (
      <Button asChild variant={variant} className={`relative ${className}`}>
        <Link href={href}>Preorder for market pickup</Link>
      </Button>
    );
  }

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
