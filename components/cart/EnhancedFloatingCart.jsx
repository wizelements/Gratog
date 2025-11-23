'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, X, Plus, Minus, ChevronRight, Sparkles, Trash2, Undo2, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useCartEngine } from '@/hooks/useCartEngine';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 🛒 Enhanced Floating Cart with creative features
 * - Smooth animations
 * - Undo delete
 * - Free shipping progress
 * - Empty state with CTA
 * - Mobile optimized
 */
export default function EnhancedFloatingCart() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [recentlyDeleted, setRecentlyDeleted] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);

  const { items, totalItems, subtotal, isEmpty, updateQuantity, removeItem, clearCart, isHydrated, addItem } = useCartEngine();

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Listen for open cart events
  useEffect(() => {
    const handleOpenCart = () => setIsOpen(true);
    window.addEventListener('openCart', handleOpenCart);
    return () => window.removeEventListener('openCart', handleOpenCart);
  }, []);

  // Cleanup undo timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimer) clearTimeout(undoTimer);
    };
  }, [undoTimer]);

  if (!isHydrated) return null;

  const handleUpdateQuantity = (itemId, change) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    const newQuantity = item.quantity + change;
    if (newQuantity > 0) {
      updateQuantity(itemId, newQuantity);
    } else {
      handleRemoveItem(item);
    }
  };

  const handleRemoveItem = (item) => {
    // Store for undo
    setRecentlyDeleted(item);
    removeItem(item.id);
    
    // Show undo toast
    toast.success('Item removed', {
      action: {
        label: 'Undo',
        onClick: () => handleUndo(item),
      },
      duration: 5000,
    });

    // Auto-clear after 5 seconds
    const timer = setTimeout(() => {
      setRecentlyDeleted(null);
    }, 5000);
    setUndoTimer(timer);
  };

  const handleUndo = (item) => {
    if (recentlyDeleted) {
      addItem(recentlyDeleted, recentlyDeleted.quantity);
      setRecentlyDeleted(null);
      if (undoTimer) clearTimeout(undoTimer);
      toast.success('Item restored!');
    }
  };

  const handleClearCart = () => {
    if (window.confirm('Clear all items from cart?')) {
      clearCart();
      toast.success('Cart cleared');
    }
  };

  const handleCheckout = () => {
    if (isEmpty) {
      toast.error('Your cart is empty');
      return;
    }
    setIsCheckingOut(true);
    window.location.href = '/order';
  };

  // Free shipping calculation
  const freeShippingThreshold = 60;
  const shippingProgress = Math.min((subtotal / freeShippingThreshold) * 100, 100);
  const needsForFreeShipping = Math.max(freeShippingThreshold - subtotal, 0);

  return (
    <>
      {/* Floating Cart Button */}
      <motion.div 
        className="fixed bottom-6 right-6 z-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="h-16 w-16 rounded-full shadow-2xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 transition-all duration-300"
          size="icon"
        >
          <div className="relative">
            <ShoppingCart className="h-7 w-7" />
            {totalItems > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center rounded-full bg-red-500 text-xs font-bold"
              >
                {totalItems > 99 ? '99+' : totalItems}
              </motion.div>
            )}
          </div>
        </Button>
      </motion.div>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">Your Cart</h2>
                    <p className="text-emerald-100 text-sm">
                      {totalItems} {totalItems === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsOpen(false)}
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-emerald-100">Subtotal</span>
                    <span className="text-3xl font-bold">${subtotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {isEmpty ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="relative mb-4">
                      <ShoppingCart className="h-24 w-24 text-gray-300" />
                      <Sparkles className="h-8 w-8 text-yellow-500 absolute -top-2 -right-2 animate-pulse" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Your cart is empty</h3>
                    <p className="text-gray-500 mb-6">Discover our amazing sea moss products!</p>
                    <Button 
                      onClick={() => {
                        setIsOpen(false);
                        window.location.href = '/catalog';
                      }}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Browse Products
                    </Button>
                  </div>
                ) : (
                  <>
                    <AnimatePresence mode="popLayout">
                      {items.map((item) => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex gap-4">
                                <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                  {item.image ? (
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100">
                                      <Sparkles className="h-8 w-8 text-emerald-600" />
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-gray-900 mb-1 truncate">
                                    {item.name}
                                  </h3>
                                  {(item.variantLabel || item.size) && (
                                    <p className="text-xs text-gray-500 mb-1">
                                      Size: {item.variantLabel || item.size}
                                    </p>
                                  )}
                                  <p className="text-emerald-600 font-bold text-lg mb-3">
                                    ${item.price.toFixed(2)}
                                  </p>

                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                                      <Button
                                        onClick={() => handleUpdateQuantity(item.id, -1)}
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 hover:bg-white"
                                      >
                                        <Minus className="h-4 w-4" />
                                      </Button>
                                      <span className="w-8 text-center font-semibold">
                                        {item.quantity}
                                      </span>
                                      <Button
                                        onClick={() => handleUpdateQuantity(item.id, 1)}
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 hover:bg-white"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </div>

                                    <Button
                                      onClick={() => handleRemoveItem(item)}
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <p className="text-sm text-gray-500">Total</p>
                                  <p className="text-lg font-bold text-gray-900">
                                    ${(item.price * item.quantity).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {items.length > 1 && (
                      <Button
                        onClick={handleClearCart}
                        variant="outline"
                        className="w-full text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear Cart
                      </Button>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              {!isEmpty && (
                <div className="border-t border-gray-200 p-6 space-y-4 bg-gray-50">
                  {/* Free Shipping Progress */}
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {shippingProgress >= 100 ? (
                          <PartyPopper className="h-5 w-5 text-green-600" />
                        ) : (
                          <Sparkles className="h-5 w-5 text-yellow-600" />
                        )}
                        <p className="text-sm font-medium">
                          {shippingProgress >= 100 ? (
                            <span className="text-green-700">🎉 FREE shipping unlocked!</span>
                          ) : (
                            <span className="text-yellow-900">FREE shipping at ${freeShippingThreshold}</span>
                          )}
                        </p>
                      </div>
                      <span className="text-sm font-bold">${subtotal.toFixed(2)} / ${freeShippingThreshold}</span>
                    </div>
                    <div className="w-full bg-yellow-200 rounded-full h-2 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${shippingProgress}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full"
                      />
                    </div>
                    {needsForFreeShipping > 0 && (
                      <p className="text-xs text-yellow-700 mt-1">
                        Just ${needsForFreeShipping.toFixed(2)} more to go!
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                    className="w-full h-14 text-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isCheckingOut ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Proceed to Checkout
                        <ChevronRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-gray-500">
                    Secure checkout powered by Square
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
