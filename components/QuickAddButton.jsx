'use client';

import { useState } from 'react';
import { ShoppingCart, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// IMPORTANT: Use same localStorage key as order page
const CART_STORAGE_KEY = 'taste-of-gratitude-cart';

export default function QuickAddButton({ product, className = '', variant = 'default', size = '16oz' }) {
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsAdding(true);

    // Get current cart from localStorage
    const currentCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
    
    // Create cart item matching order page format
    const cartItemId = `${product.id}_${size}`; // Match order page ID format
    const cartItem = {
      id: cartItemId,
      slug: product.slug || product.id,
      name: product.name,
      price: product.price,
      size: product.size || size,
      quantity: 1,
      image: product.image || product.images?.[0],
      category: product.category,
      rewardPoints: product.rewardPoints || Math.floor(product.price),
      squareProductUrl: product.squareProductUrl,
      variationId: product.variationId // Add for Square integration
    };
    
    // Check if product already in cart
    const existingItemIndex = currentCart.findIndex(item => item.id === cartItemId);
    
    let newCart;
    if (existingItemIndex >= 0) {
      // Increment quantity
      newCart = currentCart.map((item, index) => 
        index === existingItemIndex 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      toast.success(`${product.name} quantity increased!`, {
        description: `Now ${newCart[existingItemIndex].quantity} in cart`
      });
    } else {
      // Add new item
      newCart = [...currentCart, cartItem];
      toast.success(`${product.name} added to cart!`, {
        description: 'View your cart to checkout',
        action: {
          label: 'View Cart',
          onClick: () => window.dispatchEvent(new CustomEvent('openCart'))
        }
      });
    }

    // Save to localStorage
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newCart));
    
    // Dispatch event to update FloatingCart
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { cart: newCart } 
    }));

    // Animation feedback
    setIsAdding(false);
    setIsAdded(true);
    
    setTimeout(() => setIsAdded(false), 2000);
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
        } transition-all duration-300 ${isAdding ? 'scale-95' : 'scale-100'}`}
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
      } transition-all duration-300 ${isAdding ? 'scale-95' : 'hover:scale-105'}`}
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


  if (variant === 'icon') {
    return (
      <Button
        onClick={handleQuickAdd}
        size="icon"
        className={`relative ${className} ${
          isAdded 
            ? 'bg-green-600 hover:bg-green-700' 
            : 'bg-emerald-600 hover:bg-emerald-700'
        } transition-all duration-300 ${isAdding ? 'scale-95' : 'scale-100'}`}
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
      } transition-all duration-300 ${isAdding ? 'scale-95' : 'hover:scale-105'}`}
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
