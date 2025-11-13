/**
 * Checkout Service - Creates Square checkout sessions using existing endpoints
 */

import { CartItem } from '@/adapters/cartAdapter';

export interface CheckoutMeta {
  orderId: string;
  source: string;
  fulfillmentType: string;
  customerEmail: string;
}

export interface CheckoutResponse {
  success: boolean;
  checkoutUrl: string;
  paymentLinkId: string;
  orderId: string;
}

/**
 * Start Square checkout via /api/checkout or /api/create-checkout
 */
export async function startCheckout(
  orderId: string,
  meta: CheckoutMeta
): Promise<CheckoutResponse> {
  const res = await fetch('/api/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId,
      meta
    })
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'checkout_failed');
  }
  
  return res.json();
}

/**
 * Validate coupon code
 */
export async function validateCoupon(code: string): Promise<{
  valid: boolean;
  discount: number;
  message?: string;
}> {
  try {
    const res = await fetch(`/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    
    if (!res.ok) {
      return { valid: false, discount: 0, message: 'Invalid coupon code' };
    }
    
    const data = await res.json();
    return {
      valid: data.valid,
      discount: data.discount || 0,
      message: data.message
    };
  } catch (e) {
    return { valid: false, discount: 0, message: 'Failed to validate coupon' };
  }
}
