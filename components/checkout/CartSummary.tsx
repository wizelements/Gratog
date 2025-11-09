'use client';

/**
 * CartSummary - Collapsible cart summary with inline editing
 */

import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { CartItem, CartAPI } from '@/adapters/cartAdapter';
import { OrderTotals, formatCurrency } from '@/adapters/totalsAdapter';
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
      className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div
        className={`p-4 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center justify-between ${
          collapsible ? 'cursor-pointer' : ''
        }`}
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-gray-900">Your Cart</h3>
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
            {totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'}
          </Badge>
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
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-100 to-teal-100 flex-shrink-0">
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
                      <p className="text-sm font-semibold text-emerald-600 mt-1">
                        {formatCurrency(item.price)}
                      </p>
                    </div>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1">
                        <button
                          onClick={() => handleQuantityChange(item.id, -1)}
                          className="text-gray-600 hover:text-emerald-600 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-medium min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item.id, 1)}
                          className="text-gray-600 hover:text-emerald-600 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <button
                        onClick={() => {
                          onRemoveItem(item.id);
                          toast.success('Item removed from cart');
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
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
              
              {/* Free Delivery Progress */}
              {totals.freeDeliveryProgress && (
                <div className="pt-2">
                  <p className="text-xs text-gray-600 mb-1">
                    Add {formatCurrency(totals.freeDeliveryProgress.remaining)} more for FREE delivery!
                  </p>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${totals.freeDeliveryProgress.percentage}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
