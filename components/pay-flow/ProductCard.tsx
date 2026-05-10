/**
 * 🚀 Gratog Pay Flow — Product Card
 * High-performance product display with instant-add
 * Designed for one-handed mobile operation
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Minus, Sparkles } from 'lucide-react';
import { usePayFlowCart, usePayFlowInventory, usePayFlowUI, usePayFlowMetrics } from '@/lib/pay-flow/store';
import type { PayFlowProduct } from '@/lib/pay-flow/types';
import { formatPrice } from '@/lib/pay-flow/data';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: PayFlowProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const { isStaffMode } = usePayFlowUI();
  const { getProduct, updateStock, toggleAvailability } = usePayFlowInventory();
  const { items, addItem, updateQuantity, getItemCount } = usePayFlowCart();
  const { recordFirstItem } = usePayFlowMetrics();
  
  const [isAdding, setIsAdding] = useState(false);
  
  const cartItem = items.find(item => item.productId === product.id);
  const quantityInCart = cartItem?.quantity || 0;
  const maxAvailable = product.stockQuantity;
  const canAddMore = quantityInCart < maxAvailable;
  
  // Get availability status
  const getStatus = () => {
    if (!product.available || product.stockQuantity === 0) return 'sold-out';
    if (product.stockQuantity <= 5) return 'low-stock';
    return 'available';
  };
  
  const status = getStatus();
  const isSoldOut = status === 'sold-out';
  
  const handleAdd = () => {
    if (isSoldOut || !canAddMore) return;
    
    setIsAdding(true);
    addItem(product.id);
    recordFirstItem();
    
    // Visual feedback duration
    setTimeout(() => setIsAdding(false), 150);
  };
  
  const handleIncrement = () => {
    if (canAddMore) {
      updateQuantity(product.id, quantityInCart + 1);
    }
  };
  
  const handleDecrement = () => {
    if (quantityInCart > 1) {
      updateQuantity(product.id, quantityInCart - 1);
    }
  };
  
  // Staff mode handlers
  const handleStockUpdate = (delta: number) => {
    const newStock = Math.max(0, product.stockQuantity + delta);
    updateStock(product.id, newStock);
  };
  
  return (
    <div 
      data-testid="product-card"
      className={cn(
        "relative bg-white rounded-2xl overflow-hidden border transition-all duration-200",
        "shadow-sm hover:shadow-md",
        isSoldOut ? "opacity-60 border-gray-200" : "border-gray-100"
      )}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <span className="text-4xl">🥤</span>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.isPopular && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-400 text-amber-950 text-xs font-bold rounded-full">
              <Sparkles className="w-3 h-3" />
              Popular
            </span>
          )}
          {product.isNew && (
            <span className="inline-flex px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
              New
            </span>
          )}
          {product.originalPriceCents && (
            <span className="inline-flex px-2 py-1 bg-rose-500 text-white text-xs font-bold rounded-full">
              Save {formatPrice(product.originalPriceCents - product.priceCents)}
            </span>
          )}
        </div>
        
        {/* Availability Badge */}
        <div className="absolute top-2 right-2">
          {status === 'sold-out' ? (
            <span className="px-2 py-1 bg-gray-500 text-white text-xs font-bold rounded-full">
              Sold Out
            </span>
          ) : status === 'low-stock' ? (
            <span className="px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">
              {product.stockQuantity} Left
            </span>
          ) : null}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3">
        <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">
          {product.name}
        </h3>
        <p className="text-xs text-gray-500 line-clamp-1 mb-2">
          {product.ingredients}
        </p>
        
        {/* Price & Action */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(product.priceCents)}
            </span>
            {product.originalPriceCents && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(product.originalPriceCents)}
              </span>
            )}
          </div>
          
          {/* Action Button */}
          {isSoldOut ? (
            <button
              disabled
              data-testid="product-sold-out"
              className="px-4 py-2 bg-gray-200 text-gray-400 text-sm font-medium rounded-xl min-h-[44px]"
            >
              Sold Out
            </button>
          ) : quantityInCart > 0 ? (
            <div className="flex items-center gap-1 bg-gray-900 rounded-xl p-1">
              <button
                onClick={handleDecrement}
                data-testid="quantity-decrement"
                className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span data-testid="quantity-value" className="w-8 text-center text-white font-bold">
                {quantityInCart}
              </span>
              <button
                onClick={handleIncrement}
                disabled={!canAddMore}
                data-testid="quantity-increment"
                className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-lg transition-colors",
                  canAddMore 
                    ? "text-white hover:bg-white/10" 
                    : "text-gray-500 cursor-not-allowed"
                )}
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              disabled={isAdding}
              data-testid="product-card-add"
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-medium text-sm",
                "bg-gray-900 text-white min-h-[44px] active:scale-95 transition-all duration-150",
                isAdding && "scale-95 opacity-90"
              )}
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          )}
        </div>
      </div>
      
      {/* Staff Mode Overlay */}
      {isStaffMode && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3 p-4 z-10">
          <p className="text-white font-bold text-sm">Staff Mode</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStockUpdate(-1)}
              className="w-10 h-10 bg-white/20 text-white rounded-lg flex items-center justify-center hover:bg-white/30"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-white font-mono w-12 text-center">
              {product.stockQuantity}
            </span>
            <button
              onClick={() => handleStockUpdate(1)}
              className="w-10 h-10 bg-white/20 text-white rounded-lg flex items-center justify-center hover:bg-white/30"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => toggleAvailability(product.id)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium",
              product.available 
                ? "bg-green-500 text-white" 
                : "bg-gray-500 text-white"
            )}
          >
            {product.available ? 'Available' : 'Unavailable'}
          </button>
        </div>
      )}
    </div>
  );
}
