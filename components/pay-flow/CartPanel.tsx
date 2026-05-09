/**
 * 🚀 Gratog Pay Flow — Cart Panel
 * Slide-up cart with inline quantity controls
 * Full order summary with Pay Now CTA
 */

'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { X, Minus, Plus, ChevronRight } from 'lucide-react';
import { usePayFlowCart, usePayFlowUI, usePayFlowInventory, usePayFlowMetrics } from '@/lib/pay-flow/store';
import { formatPrice } from '@/lib/pay-flow/data';
import { cn } from '@/lib/utils';

export function CartPanel() {
  const { currentView, setView } = usePayFlowUI();
  const { items, updateQuantity, removeItem, calculateTotals, clearCart } = usePayFlowCart();
  const { products, getProduct } = usePayFlowInventory();
  const { recordPaymentStarted } = usePayFlowMetrics();
  
  const isOpen = currentView === 'cart';
  
  const displayItems = useMemo(() => {
    return items.map(item => {
      const product = getProduct(item.productId);
      if (!product) return null;
      
      const lineTotal = product.priceCents * item.quantity;
      const upsellTotal = item.upsellIds.reduce((sum, upsellId) => {
        const upsell = product.upsells?.find(u => u.id === upsellId);
        return sum + (upsell?.priceCents || 0) * item.quantity;
      }, 0);
      
      return {
        ...item,
        product,
        lineTotal,
        upsellTotal
      };
    }).filter(Boolean);
  }, [items, getProduct]);
  
  const { subtotalCents, taxCents, totalCents } = calculateTotals(products);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  
  const handleCheckout = () => {
    recordPaymentStarted();
    setView('payment');
  };
  
  const handleClose = () => {
    setView('browse');
  };
  
  const handleClear = () => {
    // Use custom modal instead of blocking confirm()
    if (typeof window !== 'undefined' && window.confirm) {
      clearCart();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
        onClick={handleClose}
      />
      
      {/* Panel */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">Your Order</h2>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
              {itemCount} items
            </span>
          </div>
          <div className="flex items-center gap-1">
            {items.length > 0 && (
              <button
                onClick={handleClear}
                className="px-3 py-1.5 text-sm text-rose-500 font-medium hover:bg-rose-50 rounded-lg transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close cart"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
        </div>
        
        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {displayItems.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-2 block">🛒</span>
              <p className="text-gray-500">Your cart is empty</p>
              <button
                onClick={handleClose}
                className="mt-4 text-amber-600 font-medium hover:underline"
              >
                Browse drinks →
              </button>
            </div>
          ) : (
            displayItems.map((item) => (
              <div key={item.productId} className="flex gap-3 bg-gray-50 rounded-xl p-3">
                {/* Image */}
                <div className="relative w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0">
                  {item.product.image ? (
                    <Image
                      src={item.product.image}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🥤</div>
                  )}
                </div>
                
                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{item.product.name}</h3>
                  <p className="text-sm text-gray-500">{formatPrice(item.product.priceCents)} each</p>
                  
                  {/* Upsells */}
                  {item.upsellIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.upsellIds.map(upsellId => {
                        const upsell = item.product.upsells?.find(u => u.id === upsellId);
                        return upsell ? (
                          <span key={upsellId} className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                            +{upsell.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                  
                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-gray-200">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-md transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4 text-gray-600" />
                      </button>
                      <span className="w-8 text-center font-bold text-gray-900">{item.quantity}</span>
                      <button
                        onClick={() => {
                          const maxStock = item.product.stockQuantity;
                          if (item.quantity < maxStock) {
                            updateQuantity(item.productId, item.quantity + 1);
                          }
                        }}
                        disabled={item.quantity >= item.product.stockQuantity}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                    
                    <span className="font-bold text-gray-900">
                      {formatPrice(item.lineTotal + item.upsellTotal)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Footer / Totals */}
        <div className="border-t border-gray-100 p-4 bg-white">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatPrice(subtotalCents)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax (8%)</span>
              <span>{formatPrice(taxCents)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-100">
              <span>Total</span>
              <span>{formatPrice(totalCents)}</span>
            </div>
          </div>
          
          <button
            onClick={handleCheckout}
            disabled={items.length === 0}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-lg",
              "min-h-[56px] transition-all duration-200",
              items.length > 0
                ? "bg-amber-400 text-amber-950 hover:bg-amber-500 active:scale-[0.98]"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            Pay Now
            <ChevronRight className="w-5 h-5" />
          </button>
          
          <p className="text-center text-xs text-gray-400 mt-3">
            🔒 Secure checkout powered by Square
          </p>
        </div>
      </div>
    </>
  );
}
