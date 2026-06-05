
'use client';

/**
 * CartSummary - Collapsible cart summary with inline editing
 */

import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus, X, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';
import { CartItem } from '@/adapters/cartAdapter';
import { OrderTotals, formatCurrency } from '@/adapters/totalsAdapter';
import { PREORDER_MINIMUM } from '@/lib/cart-engine';
import { toast } from 'sonner';

interface CartSummaryProps {
  cart: CartItem[];
  totals: OrderTotals;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  collapsible?: boolean;
}

export default function CartSummary({
  cart,
  totals,
  onUpdateQuantity,
  onRemoveItem,
  collapsible = true
}: CartSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const handleQuantityChange = (itemId: string, delta: number) => {
    const item = cart.find(i => i.id === itemId);
    if (!item) return;
    
    const newQuantity = item.quantity + delta;
    if (newQuantity <= 0) {
      onRemoveItem(itemId);
      toast.success('Item removed from cart');
    } else {
      onUpdateQuantity(itemId, newQuantity);
    }
  };
  
  return (
    <motion.div
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div
        className={`p-4 bg-stone-50 flex items-center justify-between ${
          collapsible ? 'cursor-pointer' : ''
        }`}
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-5 h-5 text-emerald-700" />
          <h3 className="font-semibold text-gray-900">Your Cart</h3>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-200">
            {totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'}
          </span>
        </div>
        
        {collapsible && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-gray-500" />
          </motion.div>
        )}
      </div>
      
      {/* Cart Items */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="divide-y divide-gray-100">
              {cart.map((item) => (
                <motion.div
                  key={item.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    
                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {item.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">{item.size}</p>
                      {item.isPreorder && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 mt-1">
                          ⏳ Preorder
                        </span>
                      )}
                      <p className="text-sm font-semibold text-emerald-600 mt-1">
                        {formatCurrency(item.price)}
                      </p>
                    </div>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.id, -1)}
                          className="min-h-11 min-w-11 text-gray-600 hover:text-emerald-700 transition-colors flex items-center justify-center"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-medium min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.id, 1)}
                          className="min-h-11 min-w-11 text-gray-600 hover:text-emerald-700 transition-colors flex items-center justify-center"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          onRemoveItem(item.id);
                          toast.success('Item removed from cart');
                        }}
                        className="min-h-11 min-w-11 text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center"
                        aria-label="Remove item"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* Totals */}
            <div className="p-4 bg-gray-50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
              </div>
              
              {totals.deliveryFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="font-medium">{formatCurrency(totals.deliveryFee)}</span>
                </div>
              )}
              
              {totals.tip > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tip</span>
                  <span className="font-medium">{formatCurrency(totals.tip)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium">{formatCurrency(totals.tax)}</span>
              </div>
              
              {totals.couponDiscount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Discount</span>
                  <span className="font-medium">-{formatCurrency(totals.couponDiscount)}</span>
                </div>
              )}
              
              <div className="pt-2 border-t border-gray-200 flex justify-between">
                <span className="text-base font-semibold">Total</span>
                <span className="text-lg font-bold text-emerald-600">
                  {formatCurrency(totals.total)}
                </span>
              </div>
              

            </div>

            {cart.some(item => item.isPreorder) && (() => {
              const preorderItems = cart.filter(i => i.isPreorder);
              const preorderSubtotal = preorderItems.reduce(
                (s, i) => s + ((Number(i.price) || 0) * (Number(i.quantity) || 1)), 0
              );
              const preorderOk = preorderItems.length === 0 || preorderSubtotal >= PREORDER_MINIMUM;
              
              return (
                <div className="px-4 pb-4 space-y-2">
                  <div className={`${preorderOk ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'} border rounded-lg p-3 text-sm`}>
                    <p className={`font-medium ${preorderOk ? 'text-emerald-800' : 'text-amber-800'}`}>
                      {preorderOk ? 'Preorder minimum met' : 'Preorder minimum not met'}
                    </p>
                    <p className={`text-xs ${preorderOk ? 'text-emerald-700' : 'text-amber-700'} mt-1`}>
                      {preorderOk 
                        ? 'Made fresh for your next market pickup.'
                        : `$${PREORDER_MINIMUM.toFixed(2)} minimum required. Current: $${preorderSubtotal.toFixed(2)}. Add $${(PREORDER_MINIMUM - preorderSubtotal).toFixed(2)} more.`
                      }
                    </p>
                    {!preorderOk && (
                      <div className="mt-2 w-full h-2 bg-amber-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (preorderSubtotal / PREORDER_MINIMUM) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
