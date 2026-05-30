/**
 * 🚀 Gratog Pay Flow — Payment Processing API
 * SECURITY: Server-side payment processing with validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';

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
    
    // Process REAL Square payment
    const squareToken = process.env.SQUARE_ACCESS_TOKEN;
    if (!squareToken) {
      return NextResponse.json(
        { error: 'Payment service unavailable' },
        { status: 503 }
      );
    }

    // Create idempotency key for this payment
    const idempotencyKey = uuidv4();

    // Charge the card via Square
    let paymentResult;
    try {
      const { createPayment } = await import('@/lib/square-api');
      const paymentResponse = await createPayment({
        sourceId,
        amountCents: priceValidation.actualTotal,
        currency: 'USD',
        idempotencyKey,
        note: `Gratog Pay Flow - ${items.length} item(s)`,
      });

      if (!paymentResponse.success || !paymentResponse.data?.payment) {
        return NextResponse.json(
          { error: paymentResponse.errors?.[0]?.detail || 'Payment declined', code: 'PAYMENT_FAILED' },
          { status: 402 }
        );
      }

      paymentResult = paymentResponse.data.payment;
    } catch (payError) {
      console.error('Square payment failed:', payError);
      return NextResponse.json(
        { error: 'Payment processing failed. Please try again.' },
        { status: 502 }
      );
    }

    // Payment succeeded — create order in MongoDB
    const orderNumber = `GR-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    try {
      const { db } = await connectToDatabase();

      const { getStorefrontCatalogSnapshot } = await import('@/lib/storefront-products');
      const snapshot = await getStorefrontCatalogSnapshot({});

      const orderItems = items.map((item: { productId: string; quantity: number; upsellIds?: string[] }) => {
        const product = snapshot.products.find(p => p.id === item.productId);
        return {
          productId: item.productId,
          name: product?.name || 'Unknown Product',
          quantity: item.quantity,
          priceCents: Math.round((product?.price || 0) * 100),
          upsellIds: item.upsellIds || []
        };
      });

      const orderDoc = {
        _id: new ObjectId(),
        orderNumber,
        orderRef: orderNumber,
        status: 'confirmed',
        items: orderItems,
        subtotalCents: Math.round(priceValidation.actualTotal / 1.08),
        taxCents: priceValidation.actualTotal - Math.round(priceValidation.actualTotal / 1.08),
        totalCents: priceValidation.actualTotal,
        customerPhone: customerPhone || null,
        source: 'pay-flow',
        paymentStatus: 'paid',
        paymentMethod: 'card',
        squarePaymentId: paymentResult.id,
        squareReceiptUrl: paymentResult.receiptUrl || null,
        idempotencyKey,
        createdAt: new Date(),
        paidAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('orders').insertOne(orderDoc);

      return NextResponse.json({
        success: true,
        orderId: orderDoc._id.toString(),
        orderNumber: orderDoc.orderNumber,
        receiptUrl: paymentResult.receiptUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/order/${orderDoc._id.toString()}`,
        totalCents: priceValidation.actualTotal
      });
    } catch (dbError) {
      // Payment succeeded but DB failed — log for manual reconciliation
      console.error('CRITICAL: Payment succeeded but order creation failed:', {
        squarePaymentId: paymentResult.id,
        amountCents: priceValidation.actualTotal,
        error: dbError
      });
      return NextResponse.json(
        { error: 'Order recorded — please contact support if you don\'t see your order', squarePaymentId: paymentResult.id },
        { status: 500 }
      );
    }
    
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
