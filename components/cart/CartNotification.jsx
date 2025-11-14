'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, ShoppingCart, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 🎉 Creative cart notification with undo feature
 */
export default function CartNotification() {
  const [notification, setNotification] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);

  useEffect(() => {
    const handleCartUpdate = (event) => {
      const { cart } = event.detail;
      
      // Show brief notification
      setNotification({
        count: cart.reduce((sum, i) => sum + i.quantity, 0),
        timestamp: Date.now()
      });

      // Auto-hide after 3 seconds
      setTimeout(() => setNotification(null), 3000);
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          className="fixed top-20 right-6 z-50 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg shadow-2xl p-4 flex items-center gap-3 min-w-[280px]"
        >
          <div className="bg-white/20 rounded-full p-2">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Cart Updated</p>
            <p className="text-sm text-emerald-100">
              {notification.count} {notification.count === 1 ? 'item' : 'items'} in cart
            </p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="hover:bg-white/20 rounded-full p-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
