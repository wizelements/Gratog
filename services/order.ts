/**
 * Order Service - Creates orders using existing /api/orders/create endpoint
 */

import { CartItem } from '@/adapters/cartAdapter';
import { ContactInfo, FulfillmentData } from '@/stores/checkout';

export interface OrderPayload {
  cart: CartItem[];
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  fulfillmentType: 'pickup' | 'delivery' | 'shipping';
  pickup?: {
    locationId: string;
    date: string;
    instructions?: string;
  };
  delivery?: {
    address: {
      street: string;
      suite?: string;
      city: string;
      state: string;
      zip: string;
    };
    deliveryTimeSlot: string;
    deliveryInstructions?: string;
    deliveryTip?: number;
  };
  shipping?: {
    address: {
      street: string;
      suite?: string;
      city: string;
      state: string;
      zip: string;
    };
    shippingMethod: string;
  };
  couponCode?: string;
  source?: string;
}

export interface OrderResponse {
  success: boolean;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    pricing: {
      subtotal: number;
      deliveryFee: number;
      tax: number;
      total: number;
    };
  };
}

/**
 * Create order via /api/orders/create
 */
export async function createOrder(
  contact: ContactInfo,
  fulfillment: FulfillmentData,
  cart: CartItem[],
  tip: number = 0,
  couponCode?: string
): Promise<OrderResponse> {
  // Build payload
  const payload: OrderPayload = {
    cart,
    customer: {
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone
    },
    fulfillmentType: fulfillment.type,
    couponCode,
    source: 'checkout_v2'
  };
  
  // Add fulfillment-specific data
  if (fulfillment.type === 'pickup' && fulfillment.pickup) {
    payload.pickup = {
      locationId: fulfillment.pickup.locationId,
      date: fulfillment.pickup.date?.toISOString() || new Date().toISOString(),
      instructions: fulfillment.pickup.instructions
    };
  } else if (fulfillment.type === 'delivery' && fulfillment.delivery) {
    payload.delivery = {
      address: fulfillment.delivery.address,
      deliveryTimeSlot: fulfillment.delivery.window,
      deliveryInstructions: fulfillment.delivery.notes,
      deliveryTip: tip
    };
  } else if (fulfillment.type === 'shipping' && fulfillment.shipping) {
    payload.shipping = {
      address: fulfillment.shipping.address,
      shippingMethod: fulfillment.shipping.methodId
    };
  }
  
  // Make API call
  const res = await fetch('/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'order_create_failed');
  }
  
  return res.json();
}
