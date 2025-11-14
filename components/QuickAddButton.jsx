'use client';

import { useState } from 'react';
import { ShoppingCart, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { addToUnifiedCart } from '@/lib/unified-cart';
import { createLogger } from '@/lib/logger';

const logger = createLogger('QuickAddButton');

export default function QuickAddButton({ product, size = 'default', className = '' }) {
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAdding || justAdded) return;

    logger.info('Adding product to cart', { 
      productId: product.id, 
      productName: product.name,
      price: product.price 
    });

    setIsAdding(true);

    try {
      // Ensure product has required fields
      const productToAdd = {
        ...product,
        id: product.id,
        name: product.name,
        price: product.price,
        priceCents: product.priceCents,
        image: product.image || product.images?.[0],
        category: product.category,
        slug: product.slug,
      };

      logger.debug('Product data prepared', productToAdd);

      addToUnifiedCart(productToAdd);
      
      logger.info('Product added to cart successfully', { 
        productId: product.id 
      });

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
    } finally {
      setIsAdding(false);
    }
  };

  return (
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
  );
}
