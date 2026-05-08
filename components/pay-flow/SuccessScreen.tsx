/**
 * 🚀 Gratog Pay Flow — Success Screen
 * Post-payment confirmation with order details
 * "Show vendor" message
 */

'use client';

import { useEffect } from 'react';
import { CheckCircle, Clock, Receipt, RefreshCw } from 'lucide-react';
import { usePayFlowCart, usePayFlowUI, usePayFlowInventory, usePayFlowMetrics } from '@/lib/pay-flow/store';
import { formatPrice } from '@/lib/pay-flow/data';
import { cn } from '@/lib/utils';

interface SuccessScreenProps {
  orderId?: string;
}

export function SuccessScreen({ orderId }: SuccessScreenProps) {
  const { currentView, setView, resetFlow } = usePayFlowUI();
  const { items, calculateTotals } = usePayFlowCart();
  const { products } = usePayFlowInventory();
  const { metrics } = usePayFlowMetrics();
  
  const isOpen = currentView === 'success';
  const { totalCents } = calculateTotals(products);
  
  // Generate a fallback order ID if none provided
  const displayOrderId = orderId || `GR-${Date.now().toString(36).toUpperCase()}`;
  
  // Flow time for display
  const flowTime = metrics?.totalFlowTimeMs 
    ? Math.round(metrics.totalFlowTimeMs / 1000) 
    : null;
  const hitTarget = metrics?.hitTargetTime;
  
  const handleNewOrder = () => {
    resetFlow();
    setView('browse');
  };
  
  if (!isOpen) return null;
  
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" />
      
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Success Animation Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Hero Section */}
          <div className="bg-gradient-to-b from-green-50 to-white p-6 pt-8 pb-6 text-center">
            <div className="relative mb-4">
              <div className="w-20 h-20 mx-auto bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              {/* Success rings animation */}
              <div className="absolute inset-0 w-20 h-20 mx-auto">
                <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Payment Received!</h2>
            <p className="text-gray-600 mb-2">Show this screen to the vendor</p>
            
            {flowTime && (
              <div className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                hitTarget 
                  ? "bg-green-100 text-green-800" 
                  : "bg-gray-100 text-gray-600"
              )}>
                <Clock className="w-4 h-4" />
                {hitTarget ? '⚡ Fast checkout!' : 'Completed in'} {flowTime}s
              </div>
            )}
          </div>
          
          {/* Order Card */}
          <div className="px-4">
            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              {/* Order ID */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Order Number</p>
                  <p className="text-lg font-bold text-gray-900 font-mono">{displayOrderId}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPrice(totalCents)}</p>
                </div>
              </div>
              
              {/* Items Summary */}
              <div className="space-y-2 mb-4">
                {items.map((item) => {
                  const product = products.find(p => p.id === item.productId);
                  if (!product) return null;
                  
                  return (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{item.quantity}×</span>
                        <span className="text-gray-700">{product.name}</span>
                      </div>
                      <span className="font-medium text-gray-900">
                        {formatPrice(product.priceCents * item.quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              {/* Pickup Info */}
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                <p className="text-sm font-medium text-amber-900 mb-1">
                  🎯 Present this at pickup
                </p>
                <p className="text-xs text-amber-700">
                  Your order is being prepared. Show this screen to the vendor when your name is called.
                </p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleNewOrder}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-lg bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98] transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                New Order
              </button>
              
              <a
                href={`/order-confirmation/${displayOrderId}`}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <Receipt className="w-5 h-5" />
                View Receipt
              </a>
            </div>
            
            {/* Footer Message */}
            <div className="text-center py-6">
              <p className="text-sm text-gray-400">
                Thank you for supporting Gratog! 💚
              </p>
              <p className="text-xs text-gray-300 mt-1">
                tastegratitude.shop
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
