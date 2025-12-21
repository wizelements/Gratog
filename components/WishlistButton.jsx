'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWishlistStore } from '@/stores/wishlist';

export default function WishlistButton({ 
  productId, 
  size = 'default',
  className = '' 
}) {
  const [mounted, setMounted] = useState(false);
  const { isInWishlist, toggleWishlist } = useWishlistStore();
  const [isWishlisted, setIsWishlisted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    setIsWishlisted(isInWishlist(productId));
  }, [productId, isInWishlist]);

  useEffect(() => {
    if (!mounted) return;
    
    const handleUpdate = () => {
      setIsWishlisted(isInWishlist(productId));
    };
    
    window.addEventListener('wishlistUpdate', handleUpdate);
    return () => window.removeEventListener('wishlistUpdate', handleUpdate);
  }, [mounted, productId, isInWishlist]);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWishlist(productId, false); // false = guest mode, uses localStorage
    setIsWishlisted(!isWishlisted);
  };

  const sizeClasses = {
    small: 'h-8 w-8',
    default: 'h-10 w-10',
    large: 'h-12 w-12'
  };

  const iconSizes = {
    small: 'h-4 w-4',
    default: 'h-5 w-5',
    large: 'h-6 w-6'
  };

  if (!mounted) {
    return (
      <button
        className={`${sizeClasses[size]} rounded-full bg-emerald-600 backdrop-blur-sm shadow-md flex items-center justify-center transition-all hover:scale-110 hover:bg-emerald-700 ${className}`}
        aria-label="Add to wishlist"
      >
        <Heart className={`${iconSizes[size]} text-white`} />
      </button>
    );
  }

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.85 }}
      className={`${sizeClasses[size]} rounded-full bg-emerald-600 backdrop-blur-sm shadow-md flex items-center justify-center transition-all hover:scale-110 hover:shadow-lg hover:bg-emerald-700 ${className}`}
      aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={isWishlisted}
    >
      <motion.div
        initial={false}
        animate={isWishlisted ? { scale: [1, 1.3, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Heart 
          className={`${iconSizes[size]} transition-colors ${
            isWishlisted 
              ? 'fill-red-500 text-red-500' 
              : 'text-gray-400 hover:text-red-400'
          }`} 
        />
      </motion.div>
    </motion.button>
  );
}
