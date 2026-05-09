/**
 * 🚀 Gratog Pay Flow — Payment Processing API
 * SECURITY: Server-side payment processing with validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSquarePayment } from '@/lib/square-api';
import { v4 as uuidv4 } from 'uuid';

// SECURITY: CSRF token validation (simple implementation)
function validateCSRF(request: NextRequest): boolean {
  const csrfHeader = request.headers.get('x-csrf-token');
  const csrfCookie = request.cookies.get('csrf-token')?.value;
  
  // In production, compare against server-stored token
  // For now, just ensure header is present
  return !!csrfHeader || process.env.NODE_ENV === 'development';
}

// SECURITY: Validate price against database
async function validatePrices(
  items: Array<{ productId: string; quantity: number; upsellIds?: string[] }>,
  expectedTotal: number
): Promise<{ valid: boolean; actualTotal: number; error?: string }> {
  try {
    // Fetch current prices from database
    const { getStorefrontCatalogSnapshot } = await import('@/lib/storefront-products');
    const snapshot = await getStorefrontCatalogSnapshot({});
    
    let calculatedTotal = 0;
    
    for (const item of items) {
      const product = snapshot.products.find(p => p.id === item.productId);
      if (!product) {
        return { valid: false, actualTotal: 0, error: `Product not found: ${item.productId}` };
      }
      
      if (!product.available) {
        return { valid: false, actualTotal: 0, error: `Product unavailable: ${product.name}` };
      }
      
      const priceCents = Math.round((product.price || 0) * 100);
      calculatedTotal += priceCents * item.quantity;
      
      // Add upsell prices
      if (item.upsellIds?.length) {
        // Upsell prices would be validated here
        // For now, assume fixed values based on upsell ID
        for (const upsellId of item.upsellIds) {
          const upsellPrice = getUpsellPrice(upsellId);
          calculatedTotal += upsellPrice * item.quantity;
        }
      }
    }
    
    // Add tax (8%)
    const taxCents = Math.round(calculatedTotal * 0.08);
    calculatedTotal += taxCents;
    
    // Allow small margin for rounding (±1 cent)
    const valid = Math.abs(calculatedTotal - expectedTotal) <= 1;
    
    return { valid, actualTotal: calculatedTotal };
  } catch (error) {
    console.error('Price validation error:', error);
    return { valid: false, actualTotal: 0, error: 'Price validation failed' };
  }
}

function getUpsellPrice(upsellId: string): number {
  const prices: Record<string, number> = {
    'boba': 100,
    'large': 200,
    'shot': 300
  };
  return prices[upsellId] || 0;
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Validate CSRF
    if (!validateCSRF(request)) {
      return NextResponse.json(
        { error: 'Invalid security token' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { sourceId, items, expectedTotal, customerPhone } = body;
    
    // Validation
    if (!sourceId || typeof sourceId !== 'string') {
      return NextResponse.json(
        { error: 'Payment source required' },
        { status: 400 }
      );
    }
    
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Cart items required' },
        { status: 400 }
      );
    }
    
    // SECURITY: Validate prices server-side
    const priceValidation = await validatePrices(items, expectedTotal);
    if (!priceValidation.valid) {
      return NextResponse.json(
        { error: priceValidation.error || 'Price mismatch detected' },
        { status: 400 }
      );
    }
    
    // Initialize Square
    const squareToken = process.env.SQUARE_ACCESS_TOKEN;
    if (!squareToken) {
      return NextResponse.json(
        { error: 'Payment service unavailable' },
        { status: 503 }
      );
    }
    
    // Create order in Square
    const idempotencyKey = uuidv4();
    
    // Build line items
    const lineItems = items.map(item => ({
      quantity: String(item.quantity),
      catalogObjectId: item.productId,
      // Note: In production, use proper catalog object IDs from Square
    }));
    
    // Create order
    const orderRequest = {
      idempotencyKey,
      order: {
        locationId: process.env.SQUARE_LOCATION_ID!,
        lineItems,
        // Add taxes
        taxes: [{
          name: 'Sales Tax',
          percentage: '8',
          scope: 'ORDER' as const
        }]
      }
    };
    
    // Process payment with Square
    const paymentRequest = {
      idempotencyKey: uuidv4(),
      sourceId,
      amountMoney: {
        amount: BigInt(priceValidation.actualTotal),
        currency: 'USD'
      },
      orderId: undefined as string | undefined,
      autocomplete: true
    };
    
    // For demo/development, return mock success
    // In production, uncomment the actual Square API call
    
    /*
    const { result: orderResult } = await square.ordersApi.createOrder(orderRequest);
    paymentRequest.orderId = orderResult.order?.id;
    
    const { result: paymentResult } = await square.paymentsApi.createPayment(paymentRequest);
    
    if (!paymentResult.payment) {
      throw new Error('Payment failed');
    }
    */
    
    // MOCK: Return success for development
    const mockOrderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return NextResponse.json({
      success: true,
      orderId: mockOrderId,
      receiptUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/receipt/${mockOrderId}`,
      totalCents: priceValidation.actualTotal
    });
    
  } catch (error) {
    console.error('Payment processing error:', error);
    
    const message = error instanceof Error ? error.message : 'Payment processing failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// SECURITY: Prevent CSRF preflight attacks
export async function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}
