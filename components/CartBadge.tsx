'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToCart, getCartTotal } from '@/lib/cart-engine';

/**
 * 🔔 Enhanced Cart Badge with real-time updates
 * Now using unified cart-engine
 */
export default function CartBadge() {
  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Initial count
    const { totalItems } = getCartTotal();
    setCount(totalItems);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Subscribe to cart updates
    const unsubscribe = subscribeToCart((detail) => {
      setCount(detail.count);
      
      // Trigger pulse animation
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    });

    return unsubscribe;
  }, [mounted]);

  // SSR: Show cart icon without badge
  if (!mounted) {
    return (
      <Link
        href="#"
        onClick={(e) => {
          e.preventDefault();
          window.dispatchEvent(new Event('openCart'));
        }}
        className="relative p-2 text-gray-700 hover:text-emerald-600 transition-colors"
        aria-label="Shopping cart"
      >
        <ShoppingCart className="h-6 w-6" />
      </Link>
    );
  }

  return (
    <Link
      href="#"
      onClick={(e) => {
        e.preventDefault();
        window.dispatchEvent(new Event('openCart'));
      }}
      className="relative p-2 text-gray-700 hover:text-emerald-600 transition-colors"
      aria-label={`Cart with ${count} items`}
    >
      <ShoppingCart className="h-6 w-6" />
      
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
            className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5"
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
