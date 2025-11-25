<<<<<<< HEAD
=======
// @ts-nocheck
>>>>>>> upstream/main
'use client';

import { motion } from 'framer-motion';
import { Lock, CreditCard, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CartItem } from '@/adapters/cartAdapter';
import { OrderTotals, formatCurrency } from '@/adapters/totalsAdapter';
import { ContactInfo, FulfillmentData } from '@/stores/checkout';
import Image from 'next/image';
import { useState } from 'react';
import { createOrder } from '@/services/order';
import { startCheckout } from '@/services/checkout';
import { toast } from 'sonner';
import { track } from '@/utils/analytics';

interface ReviewAndPayProps {
  cart: CartItem[];
  totals: OrderTotals;
  contact: ContactInfo;
  fulfillment: FulfillmentData;
  tip: number;
  couponCode?: string;
  onBack: () => void;
}

export default function ReviewAndPay({
  cart,
  totals,
  contact,
  fulfillment,
  tip,
  couponCode,
  onBack
}: ReviewAndPayProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handlePayment = async () => {
    setIsProcessing(true);
    track('payment_initiated', { method: 'card', fulfillmentType: fulfillment.type });
    
    try {
      // Create order
      const orderResponse = await createOrder(
        contact,
        fulfillment,
        cart,
        tip,
        couponCode
      );
      
      // Start Square checkout
      const checkoutResponse = await startCheckout(orderResponse.order.id, {
        orderId: orderResponse.order.id,
        source: 'checkout_v2',
        fulfillmentType: fulfillment.type,
        customerEmail: contact.email
      });
      
      // Redirect to Square checkout
      window.location.href = checkoutResponse.checkoutUrl;
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed. Please try again.');
      track('payment_failed', { error: error.message });
      setIsProcessing(false);
    }
  };
  
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Order Summary */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Order Summary</h3>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Items */}
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-100 to-teal-100 flex-shrink-0">
                  <Image src={item.image} alt={item.name} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-gray-900 truncate">{item.name}</h4>
                  <p className="text-xs text-gray-500">Qty: {item.quantity} • {item.size}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>
          
          {/* Totals */}
          <div className="pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            {totals.deliveryFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery Fee</span>
                <span>{formatCurrency(totals.deliveryFee)}</span>
              </div>
            )}
            {totals.tip > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tip</span>
                <span>{formatCurrency(totals.tip)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <span>{formatCurrency(totals.tax)}</span>
            </div>
            {totals.couponDiscount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Discount</span>
                <span>-{formatCurrency(totals.couponDiscount)}</span>
              </div>
            )}
            <div className="pt-2 border-t flex justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="text-lg font-bold text-emerald-600">
                {formatCurrency(totals.total)}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Delivery/Pickup Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">
          {fulfillment.type === 'pickup' ? 'Pickup' : fulfillment.type === 'delivery' ? 'Delivery' : 'Shipping'} Details
        </h4>
        <p className="text-sm text-gray-600">
          {fulfillment.type === 'delivery' && fulfillment.delivery && (
            <>
              {fulfillment.delivery.address.street}, {fulfillment.delivery.address.city}, {fulfillment.delivery.address.state} {fulfillment.delivery.address.zip}
              <br />
              Window: {fulfillment.delivery.window}
            </>
          )}
          {fulfillment.type === 'pickup' && fulfillment.pickup && (
            <>
              {fulfillment.pickup.date?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </>
          )}
        </p>
        <button onClick={onBack} className="text-sm text-emerald-600 hover:underline mt-2">
          Edit details
        </button>
      </div>
      
      {/* Payment Button */}
      <div className="space-y-4">
        <Button
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              Processing...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Complete Order • {formatCurrency(totals.total)}
            </div>
          )}
        </Button>
        
        {/* Trust Indicators */}
        <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Secure checkout</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🔒 Powered by Square</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
