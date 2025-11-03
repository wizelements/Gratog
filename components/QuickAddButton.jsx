'use client';

import { useState } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { addToCart } from '@/lib/cartUtils';

export default function QuickAddButton({ product, className = '', variant = 'default', size = '16oz' }) {
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsAdding(true);

    try {
      const updatedCart = addToCart(product, 1, size);
      
      toast.success(`${product.name} added to cart!`, {
        description: 'View your cart to checkout',
        action: {
          label: 'View Cart',
          onClick: () => window.dispatchEvent(new CustomEvent('openCart'))
        }
      });

      setIsAdding(false);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error('Failed to add to cart');
      setIsAdding(false);
    }
  };

  if (variant === 'icon') {
    return (
      <Button
        onClick={handleQuickAdd}
        size="icon"
        className={`relative ${className} ${
          isAdded 
            ? 'bg-green-600 hover:bg-green-700' 
            : 'bg-emerald-600 hover:bg-emerald-700'
        } transition-all duration-300`}
        disabled={isAdding}
      >
        {isAdding ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
        ) : isAdded ? (
          <Check className="h-5 w-5 animate-bounce" />
        ) : (
          <ShoppingCart className="h-5 w-5" />
        )}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleQuickAdd}
      className={`relative group ${className} ${
        isAdded 
          ? 'bg-green-600 hover:bg-green-700' 
          : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
      } transition-all duration-300`}
      disabled={isAdding}
    >
      {isAdding ? (
        <>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
          Adding...
        </>
      ) : isAdded ? (
        <>
          <Check className="mr-2 h-5 w-5 animate-bounce" />
          Added!
        </>
      ) : (
        <>
          <ShoppingCart className="mr-2 h-5 w-5 group-hover:animate-bounce" />
          Add to Cart
        </>
      )}
    </Button>
  );
}
