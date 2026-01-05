/**
 * Checkout Service - Handles coupon validation and legacy checkout flows
 * 
 * IMPORTANT: Field names and data structures must match the backend API contracts.
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

export class CheckoutError extends Error {
  public readonly code: string;
  
  constructor(message: string, code: string = 'CHECKOUT_ERROR') {
    super(message);
    this.name = 'CheckoutError';
    this.code = code;
  }
}

/**
 * Start Square checkout via /api/create-checkout
 * 
 * NOTE: This is for the legacy payment links flow. The new checkout uses
 * in-app payment via /api/payments. Consider deprecating this if not used.
 * 
 * API expects:
 * - items: Array of cart items with catalogObjectId, name, quantity, price
 * - contact: { name, email, phone }
 * - fulfillment: { type, address?, pickupLocation?, pickupDate? }
 */
export async function startCheckout(
  cart: CartItem[],
  contact: { name: string; email: string; phone?: string },
  fulfillment: { 
    type: 'pickup' | 'delivery' | 'shipping';
    address?: { street: string; city: string; state: string; zip: string };
    pickupLocation?: string;
    pickupDate?: string;
  }
): Promise<CheckoutResponse> {
  // Validate inputs
  if (!cart || cart.length === 0) {
    throw new CheckoutError('Cart cannot be empty', 'EMPTY_CART');
  }
  if (!contact.name?.trim()) {
    throw new CheckoutError('Contact name is required', 'MISSING_NAME');
  }
  if (!contact.email?.trim()) {
    throw new CheckoutError('Contact email is required', 'MISSING_EMAIL');
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  try {
    const res = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart.map(item => ({
          catalogObjectId: item.variationId || item.productId || item.id,
          name: item.name?.slice(0, 100),
          quantity: Math.max(1, item.quantity || 1),
          price: Math.max(0, item.price || 0)
        })),
        contact: {
          name: contact.name.trim().slice(0, 100),
          email: contact.email.trim().toLowerCase(),
          phone: contact.phone?.trim()
        },
        fulfillment
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Checkout failed' }));
      throw new CheckoutError(error.error || error.message || 'checkout_failed', 'API_ERROR');
    }
    
    return res.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof CheckoutError) {
      throw error;
    }
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CheckoutError('Request timed out', 'TIMEOUT');
    }
    
    throw new CheckoutError(
      error instanceof Error ? error.message : 'Unknown error',
      'NETWORK_ERROR'
    );
  }
}

/**
 * Coupon validation result matching API response structure
 */
export interface CouponValidationResult {
  valid: boolean;
  discountAmountCents: number;
  freeShipping: boolean;
  description?: string;
  code?: string;
  error?: string;
}

/**
 * Validate coupon code via /api/coupons/validate
 * 
 * API expects:
 * - couponCode (not just "code")
 * - customerEmail (optional but recommended)
 * - orderTotal (in cents, for proper discount calculation)
 * 
 * API returns:
 * - valid: boolean
 * - coupon: { id, code, discountAmount, freeShipping, type, expiresAt }
 * - discount: { amount, freeShipping, description }
 */
export async function validateCoupon(
  code: string,
  customerEmail?: string,
  orderTotalCents?: number
): Promise<CouponValidationResult> {
  // Input validation
  const trimmedCode = code?.trim();
  if (!trimmedCode) {
    return { 
      valid: false, 
      discountAmountCents: 0, 
      freeShipping: false,
      error: 'Coupon code is required' 
    };
  }
  
  // Validate code format (alphanumeric, max 20 chars)
  if (!/^[A-Za-z0-9_-]{1,20}$/.test(trimmedCode)) {
    return { 
      valid: false, 
      discountAmountCents: 0, 
      freeShipping: false,
      error: 'Invalid coupon code format' 
    };
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for validation
  
  try {
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        couponCode: trimmedCode.toUpperCase(),
        customerEmail: customerEmail?.trim().toLowerCase(),
        orderTotal: orderTotalCents ? Math.max(0, Math.round(orderTotalCents)) : undefined
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Invalid coupon' }));
      return { 
        valid: false, 
        discountAmountCents: 0, 
        freeShipping: false,
        error: errorData.error || 'Invalid coupon code' 
      };
    }
    
    const data = await res.json();
    
    if (!data.valid) {
      return { 
        valid: false, 
        discountAmountCents: 0, 
        freeShipping: false,
        error: data.error || 'Coupon not valid'
      };
    }
    
    // API returns discount.amount in cents
    const discountAmount = Number(data.discount?.amount) || Number(data.coupon?.discountAmount) || 0;
    
    return {
      valid: true,
      discountAmountCents: Math.max(0, Math.round(discountAmount)),
      freeShipping: Boolean(data.discount?.freeShipping || data.coupon?.freeShipping),
      description: data.discount?.description,
      code: data.coupon?.code || trimmedCode
    };
  } catch (error) {
    clearTimeout(timeoutId);
    
    console.error('Coupon validation error:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      return { 
        valid: false, 
        discountAmountCents: 0, 
        freeShipping: false,
        error: 'Validation timed out' 
      };
    }
    
    return { 
      valid: false, 
      discountAmountCents: 0, 
      freeShipping: false,
      error: 'Failed to validate coupon' 
    };
  }
}

/**
 * Legacy validateCoupon for backwards compatibility
 * @deprecated Use validateCoupon with full parameters instead
 */
export async function validateCouponSimple(code: string): Promise<{
  valid: boolean;
  discount: number;
  message?: string;
}> {
  const result = await validateCoupon(code);
  return {
    valid: result.valid,
    discount: result.discountAmountCents / 100, // Convert cents to dollars
    message: result.error || result.description
  };
}
