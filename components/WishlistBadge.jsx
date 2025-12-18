'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useWishlistStore } from '@/stores/wishlist';

export default function WishlistBadge() {
  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [pulse, setPulse] = useState(false);
  const { getCount } = useWishlistStore();

  useEffect(() => {
    setMounted(true);
    setCount(getCount());
  }, [getCount]);

  useEffect(() => {
    if (!mounted) return;

    const handleUpdate = (e) => {
      setCount(e.detail.count);
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    };

    window.addEventListener('wishlistUpdate', handleUpdate);
    return () => window.removeEventListener('wishlistUpdate', handleUpdate);
  }, [mounted]);

  if (!mounted) {
    return (
      <Link
        href="/wishlist"
        className="relative p-2 text-gray-700 hover:text-red-500 transition-colors"
        aria-label="Wishlist"
      >
        <Heart className="h-6 w-6" />
      </Link>
    );
  }

  return (
    <Link
      href="/wishlist"
      className="relative p-2 text-gray-700 hover:text-red-500 transition-colors"
      aria-label={`Wishlist with ${count} items`}
    >
      <Heart className="h-6 w-6" />
      
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: pulse ? [1, 1.3, 1] : 1,
              opacity: 1 
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5"
            aria-live="polite"
            aria-atomic="true"
          >
            {count > 99 ? '99+' : count}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
