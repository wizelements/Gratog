'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ShoppingCart, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { addToCart } from '@/lib/cart-engine';
import { getAddToCartLabel, getAddedToCartMessage } from '@/lib/purchase-status';
import { findUnapprovedCurrentMenuItem } from '@/lib/order-admission';

/**
 * ⚡ Quick Add Button - Enhanced with global loading states
 * 🎯 UX IMPROVEMENTS: Global toast feedback, prevents double-click, cart animation
 */
export default function QuickAddButton({ product, selectedVariant, variant = 'default', className = '' }) {
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // A zero/negative stock reading is not merchant permission to take preorder money.
  const isPreorder = Boolean(product?.isPreorder || product?.preorderOnly);
  const outOfStock = product?.stock != null && Number(product.stock) <= 0 && !isPreorder;
  const checkoutReady = product?.checkoutReady !== false && !outOfStock;
  const purchaseStatus = isPreorder ? 'preorder' : 'in_stock';
  const requiresMarketPickup = Boolean(
    isPreorder ||
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

    // Out-of-stock approved items remain requestable as explicitly acknowledged
    // future-batch preorders; no Square charge occurs until the merchant
    // confirms a safe capacity and a fulfillment method.
    const approved = product && !findUnapprovedCurrentMenuItem([product]);
    const requestKey = product?.curatedProductId || product?.slug || product?.name || product?.id;
    const requestHref = `/order-request?product=${encodeURIComponent(requestKey || '')}`;
    return (
      <Button asChild variant={variant} className={`relative ${className}`}>
        <Link href={approved ? requestHref : productHref}>
          {approved ? 'Request preorder — no charge' : 'View details'}
        </Link>
      </Button>
    );
  }

  if (requiresMarketPickup) {
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
