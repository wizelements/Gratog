/**
 * 🚀 Gratog Pay Flow — Payment API Route
 * Uses existing Square API via square-extension.ts
 * Processes payments for market orders
 */

import { NextRequest, NextResponse } from 'next/server';
import { processPayFlowPayment, PayFlowPaymentResult } from '@/lib/pay-flow/square-extension';

interface PaymentBody {
  sourceId: string;
  amountCents: number;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    priceCents: number;
    upsellIds?: string[];
    catalogObjectId?: string;
  }>;
  customerPhone?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentBody = await request.json();
    const { sourceId, amountCents, items, customerPhone } = body;
    
    // Validation
    if (!sourceId) {
      return NextResponse.json(
        { success: false, error: 'Payment source required' },
        { status: 400 }
      );
    }
    
    if (!amountCents || amountCents < 50) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount' },
        { status: 400 }
      );
    }
    
    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No items in order' },
        { status: 400 }
      );
    }
    
    // Process payment using square-extension
    const result: PayFlowPaymentResult = await processPayFlowPayment({
      sourceId,
      amountCents,
      items,
      customerPhone
    });
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        orderId: result.orderId,
        squareOrderId: result.squareOrderId,
        paymentId: result.paymentId,
        receiptUrl: result.receiptUrl,
        totalCents: result.totalCents,
        status: result.status
      });
    }
    
    // Payment failed
    return NextResponse.json({
      success: false,
      error: result.error || 'Payment failed',
      orderId: result.orderId,
      paymentId: result.paymentId
    }, { status: 400 });
    
  } catch (error) {
    console.error('Payment processing error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Payment processing failed'
    }, { status: 500 });
  }
}
