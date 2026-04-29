import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import MarketOrder from '@/models/MarketOrder';
import { getSquareClient, getSquareLocationId } from '@/lib/square';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';

/**
 * POST /api/payments/square
 * Create Square payment and return checkout URL
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, amount, currency = 'USD' } = body;

    if (!orderId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find order
    const order = await MarketOrder.findById(orderId);
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Create Square checkout
    const client = getSquareClient();
    const locationId = getSquareLocationId();

    const checkoutResponse = await client.checkout.createPaymentLink({
      idempotencyKey: nanoid(),
      quickPay: {
        name: `Order #${order.orderNumber}`,
        priceMoney: {
          amount: BigInt(Math.round(amount * 100)), // Convert to cents
          currency,
        },
        locationId,
      },
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/order/complete?order=${order.orderNumber}`,
    });

    if (!checkoutResponse.paymentLink?.url) {
      throw new Error('Failed to create Square checkout');
    }

    // Update order with Square payment ID
    order.squarePaymentId = checkoutResponse.paymentLink?.orderId;
    await order.save();

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutResponse.paymentLink.url,
    });
  } catch (error) {
    console.error('Square payment creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
