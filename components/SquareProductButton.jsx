'use client';

import { Button } from '@/components/ui/button';
import { ExternalLink, ShoppingCart } from 'lucide-react';
import { generateSquareCheckoutUrl, trackSquareCheckoutAnalytics } from '@/lib/simple-square-redirect';
import { toast } from 'sonner';

/**
 * Simple Square Product Button Component
 * Redirects directly to Square's hosted checkout
 */
export default function SquareProductButton({ 
  product, 
  quantity = 1, 
  customerEmail = null,
  className = '',
  variant = 'default',
  size = 'default',
  children,
  disabled = false,
  trackAnalytics = true
}) {
  const handleSquareCheckout = async () => {
    try {
      if (!product.squareProductUrl) {
        toast.error('Product checkout not available');
        return;
      }

      // Create mock order for URL generation
      const mockOrder = {
        items: [{
          ...product,
          quantity
        }]
      };

      const checkoutUrl = generateSquareCheckoutUrl(mockOrder);
      
      // Track analytics if enabled
      if (trackAnalytics) {
        await trackSquareCheckoutAnalytics(product.slug, customerEmail, {
          quantity,
          price: product.price,
          category: product.category
        });
      }
      
      // Show loading toast
      toast.loading('Redirecting to Square checkout...', { duration: 2000 });
      
      // Redirect to Square after short delay
      setTimeout(() => {
        window.open(checkoutUrl, '_blank');
      }, 1000);
      
    } catch (error) {
      console.error('Square checkout error:', error);
      toast.error('Failed to open checkout. Please try again.');
    }
  };

  return (
    <Button
      onClick={handleSquareCheckout}
      disabled={disabled || !product.squareProductUrl}
      variant={variant}
      size={size}
      className={className}
    >
      {children || (
        <>
          <ExternalLink className="mr-2 h-4 w-4" />
          Buy Now
        </>
      )}
    </Button>
  );
}

/**
 * Square Add to Cart Button
 * For adding items to a cart before redirecting to Square
 */
export function SquareAddToCartButton({ 
  product, 
  onAddToCart,
  className = '',
  disabled = false 
}) {
  const handleAddToCart = () => {
    if (onAddToCart && typeof onAddToCart === 'function') {
      onAddToCart(product);
      toast.success(`Added ${product.name} to cart`);
    }
  };

  return (
    <Button
      onClick={handleAddToCart}
      disabled={disabled}
      variant="outline"
      className={className}
    >
      <ShoppingCart className="mr-2 h-4 w-4" />
      Add to Cart
    </Button>
  );
}