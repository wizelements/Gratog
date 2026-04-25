/**
 * Order Service - Creates orders using existing /api/orders/create endpoint
 * 
 * CRITICAL: This file transforms checkout store data to match the API's expected format.
 * The API expects a FLAT structure, not nested objects for addresses.
 */

import { CartItem } from '@/adapters/cartAdapter';
import { ContactInfo, FulfillmentData } from '@/stores/checkout';

export interface OrderResponse {
  success: boolean;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus?: string;
    squareOrderId?: string;
    squareCustomerId?: string;
    orderAccessToken?: string | null;
    orderAccessTokenExpiresAt?: string | null;
    pricing: {
      subtotal: number;
      deliveryFee: number;
      tax: number;
      total: number;
    };
  };
}

export class OrderCreationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  
  constructor(message: string, code: string = 'ORDER_CREATION_FAILED', statusCode: number = 500) {
    super(message);
    this.name = 'OrderCreationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Transform cart items to API format
 * API validation requires: productId OR variationId OR catalogObjectId, quantity, price
 */
function transformCartItems(cart: CartItem[]): Array<Record<string, unknown>> {
  if (!Array.isArray(cart) || cart.length === 0) {
    throw new OrderCreationError('Cart cannot be empty', 'EMPTY_CART', 400);
  }
  
  return cart.map((item, index) => {
    // Validate required fields
    if (!item.quantity || item.quantity <= 0) {
      throw new OrderCreationError(`Invalid quantity for item ${index + 1}`, 'INVALID_QUANTITY', 400);
    }
    if (typeof item.price !== 'number' || item.price < 0) {
      throw new OrderCreationError(`Invalid price for item ${index + 1}`, 'INVALID_PRICE', 400);
    }
    
    return {
      // Use variationId as primary identifier (matches Square catalog)
      productId: item.productId || item.id,
      variationId: item.variationId || item.variant?.id,
      catalogObjectId: item.variationId || item.variant?.id || item.productId || item.id,
      name: sanitizeString(item.name, 100),
      price: item.price,
      quantity: item.quantity,
      size: item.size,
      image: item.image,
      category: item.category,
      rewardPoints: item.rewardPoints,
      // CRITICAL FIX: Pass preorder and market-exclusive flags for server validation
      isPreorder: item.isPreorder || false,
      marketExclusive: item.marketExclusive || false
    };
  });
}

/**
 * Sanitize string input to prevent XSS
 */
function sanitizeString(input: string | undefined | null, maxLength: number = 255): string {
  if (!input) return '';
  return String(input)
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ''); // Basic XSS prevention
}

/**
 * Validate contact information
 */
function validateContact(contact: ContactInfo): void {
  if (!contact.firstName?.trim()) {
    throw new OrderCreationError('First name is required', 'MISSING_FIRST_NAME', 400);
  }
  if (!contact.lastName?.trim()) {
    throw new OrderCreationError('Last name is required', 'MISSING_LAST_NAME', 400);
  }
  if (!contact.email?.trim()) {
    throw new OrderCreationError('Email is required', 'MISSING_EMAIL', 400);
  }
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(contact.email.trim())) {
    throw new OrderCreationError('Invalid email format', 'INVALID_EMAIL', 400);
  }
  if (!contact.phone?.trim()) {
    throw new OrderCreationError('Phone number is required', 'MISSING_PHONE', 400);
  }
}

/**
 * Validate fulfillment data based on type
 */
function validateFulfillment(fulfillment: FulfillmentData): void {
  if (!fulfillment.type) {
    throw new OrderCreationError('Fulfillment type is required', 'MISSING_FULFILLMENT_TYPE', 400);
  }
  
  if (fulfillment.type === 'delivery') {
    if (!fulfillment.delivery?.address?.street?.trim()) {
      throw new OrderCreationError('Delivery street address is required', 'MISSING_STREET', 400);
    }
    if (!fulfillment.delivery?.address?.city?.trim()) {
      throw new OrderCreationError('Delivery city is required', 'MISSING_CITY', 400);
    }
    if (!fulfillment.delivery?.address?.zip?.trim()) {
      throw new OrderCreationError('Delivery ZIP code is required', 'MISSING_ZIP', 400);
    }
  }
  
  if (fulfillment.type === 'pickup') {
    if (!fulfillment.pickup?.locationId) {
      throw new OrderCreationError('Pickup location is required', 'MISSING_PICKUP_LOCATION', 400);
    }
  }
  
  if (fulfillment.type === 'shipping') {
    if (!fulfillment.shipping?.address?.street?.trim()) {
      throw new OrderCreationError('Shipping street address is required', 'MISSING_STREET', 400);
    }
    if (!fulfillment.shipping?.address?.city?.trim()) {
      throw new OrderCreationError('Shipping city is required', 'MISSING_CITY', 400);
    }
    if (!fulfillment.shipping?.address?.zip?.trim()) {
      throw new OrderCreationError('Shipping ZIP code is required', 'MISSING_ZIP', 400);
    }
    if (!fulfillment.shipping?.address?.state?.trim()) {
      throw new OrderCreationError('Shipping state is required', 'MISSING_STATE', 400);
    }
  }
}

/**
 * Create order via /api/orders/create
 * 
 * IMPORTANT: The API expects a flat structure for address fields:
 * - deliveryAddress (not delivery.address)
 * - shippingAddress (not shipping.address)  
 * - customer.name (full name, not firstName/lastName separately)
 * - couponDiscount in DOLLARS (not cents) - see enhanced-order-tracking.js
 * 
 * @throws {OrderCreationError} If validation fails or API returns error
 */
export async function createOrder(
  contact: ContactInfo,
  fulfillment: FulfillmentData,
  cart: CartItem[],
  tip: number = 0,
  couponCode?: string,
  couponDiscountDollars: number = 0
): Promise<OrderResponse> {
  // Client-side validation (fail fast before network call)
  validateContact(contact);
  validateFulfillment(fulfillment);
  
  // Validate tip and discount
  const sanitizedTip = Math.max(0, Number(tip) || 0);
  const sanitizedDiscount = Math.max(0, Number(couponDiscountDollars) || 0);
  
  // Build payload matching API expected structure
  const payload: Record<string, unknown> = {
    // Transform cart items to API format (also validates)
    cart: transformCartItems(cart),
    
    // Customer - API validates name, email, phone
    customer: {
      name: `${contact.firstName.trim()} ${contact.lastName.trim()}`,
      firstName: sanitizeString(contact.firstName, 50),
      lastName: sanitizeString(contact.lastName, 50),
      email: contact.email.trim().toLowerCase(),
      phone: contact.phone.trim()
    },
    
    // Fulfillment type
    fulfillmentType: fulfillment.type,
    
    // Optional fields
    couponCode: couponCode?.trim() || undefined,
    couponDiscount: sanitizedDiscount, // API expects dollars, not cents
    source: 'checkout_v2',
    
    // Order timing - default to 'asap'; pickup with a date uses 'scheduled'
    orderTiming: (fulfillment.type === 'pickup' && fulfillment.pickup?.date)
      ? {
          mode: 'scheduled' as const,
          requestedDate: fulfillment.pickup.date.toISOString().split('T')[0],
        }
      : { mode: 'asap' as const }
  };
  
  // Add fulfillment-specific data with FLAT structure expected by API
  if (fulfillment.type === 'pickup' && fulfillment.pickup) {
    payload.pickup = {
      locationId: fulfillment.pickup.locationId,
      date: fulfillment.pickup.date?.toISOString() || new Date().toISOString(),
      instructions: sanitizeString(fulfillment.pickup.instructions, 500)
    };
    
    // Map locationId to fulfillment type if it's dunwoody (legacy: browns_mill)
    if (fulfillment.pickup.locationId === 'browns_mill' || fulfillment.pickup.locationId === 'dunwoody') {
      payload.fulfillmentType = 'pickup_dunwoody';
    } else {
      payload.fulfillmentType = 'pickup_market';
    }
  } else if (fulfillment.type === 'delivery' && fulfillment.delivery) {
    // API expects deliveryAddress at TOP LEVEL
    payload.deliveryAddress = {
      street: sanitizeString(fulfillment.delivery.address.street, 100),
      suite: sanitizeString(fulfillment.delivery.address.suite, 50),
      city: sanitizeString(fulfillment.delivery.address.city, 50),
      state: fulfillment.delivery.address.state?.trim() || 'GA',
      zip: fulfillment.delivery.address.zip?.trim()
    };
    
    payload.deliveryTimeSlot = fulfillment.delivery.window;
    payload.deliveryInstructions = sanitizeString(fulfillment.delivery.notes, 500);
    payload.deliveryTip = sanitizedTip;
  } else if (fulfillment.type === 'shipping' && fulfillment.shipping) {
    // API expects shippingAddress at TOP LEVEL
    payload.shippingAddress = {
      street: sanitizeString(fulfillment.shipping.address.street, 100),
      suite: sanitizeString(fulfillment.shipping.address.suite, 50),
      city: sanitizeString(fulfillment.shipping.address.city, 50),
      state: fulfillment.shipping.address.state?.trim(),
      zip: fulfillment.shipping.address.zip?.trim()
    };
    
    payload.shippingMethod = fulfillment.shipping.methodId;
  }
  
  // Make API call with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
  
  try {
    const res = await fetch('/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    let errorData: { error?: string; message?: string; code?: string } = {};
    
    if (!res.ok) {
      try {
        errorData = await res.json();
      } catch {
        // Response wasn't JSON
      }
      
      const errorMessage = errorData.error || errorData.message || 'Failed to create order';
      const errorCode = errorData.code || 'ORDER_CREATION_FAILED';
      
      throw new OrderCreationError(errorMessage, errorCode, res.status);
    }
    
    const responseData = await res.json();
    
    // Validate response structure
    if (!responseData.success || !responseData.order?.id) {
      throw new OrderCreationError(
        responseData.error || 'Invalid response from server',
        'INVALID_RESPONSE',
        500
      );
    }
    
    return responseData;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof OrderCreationError) {
      throw error;
    }
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new OrderCreationError('Request timed out', 'TIMEOUT', 408);
      }
      throw new OrderCreationError(error.message, 'NETWORK_ERROR', 0);
    }
    
    throw new OrderCreationError('Unknown error occurred', 'UNKNOWN_ERROR', 500);
  }
}
