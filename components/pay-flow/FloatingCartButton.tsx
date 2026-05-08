/**
 * 🚀 Gratog Pay Flow — Floating Cart Button
 * Persistent cart access with live item count
 * Always accessible in thumb zone
 */

'use client';

import { ShoppingBag } from 'lucide-react';
import { usePayFlowCart, usePayFlowUI, usePayFlowMetrics } from '@/lib/pay-flow/store';
import { usePayFlowInventory } from '@/lib/pay-flow/store';
import { formatPrice } from '@/lib/pay-flow/data';
import { cn } from '@/lib/utils';

interface FloatingCartButtonProps {
  className?: string;
}

export function FloatingCartButton({ className }: FloatingCartButtonProps) {
  const { items, calculateTotals } = usePayFlowCart();
  const { products } = usePayFlowInventory();
  const { setView } = usePayFlowUI();
  const { recordCartOpened } = usePayFlowMetrics();
  
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const { totalCents } = calculateTotals(products);
  
  const handleClick = () => {
    recordCartOpened();
    setView('cart');
  };
  
  if (itemCount === 0) return null;
  
  return (
    <button
      onClick={handleClick}
      className={cn(
        "fixed bottom-4 right-4 z-40 flex items-center gap-3",
        "bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-2xl",
        "hover:bg-gray-800 active:scale-95 transition-all duration-200",
        "min-h-[56px]",
        className
      )}
      aria-label={`Cart with ${itemCount} items`}
    >
      <div className="relative">
        <ShoppingBag className="w-6 h-6" />
        <span className="absolute -top-2 -right-2 w-5 h-5 bg-amber-400 text-amber-950 text-xs font-bold rounded-full flex items-center justify-center">
          {itemCount > 9 ? '9+' : itemCount}
        </span>
      </div>
      <div className="flex flex-col items-start">
        <span className="text-xs text-gray-400 font-medium">{items.length} items</span>
        <span className="text-sm font-bold">{formatPrice(totalCents)}</span>
      </div>
    </button>
  );
}
