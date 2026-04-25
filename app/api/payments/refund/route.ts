import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import MarketOrder from '@/models/MarketOrder';
import DailyInventory from '@/models/DailyInventory';
import { z } from 'zod';

export const runtime = 'nodejs';

const refundSchema = z.object({
  orderNumber: z.string(),
  reason: z.string().min(1).max(500),
  amount: z.number().positive().optional(), // Partial refund amount
});

/**
 * POST /api/payments/refund
 * Process refund for an order
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.ADMIN_API_KEY;
    
    if (!authHeader || authHeader.replace('Bearer ', '') !== apiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = refundSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { orderNumber, reason, amount } = validation.data;

    await connectToDatabase();

    const order = await MarketOrder.findOne({ orderNumber });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'REFUNDED') {
      return NextResponse.json({ error: 'Order already refunded' }, { status: 400 });
    }

    // Calculate refund amount
    const refundAmount = amount || order.total;
    
    if (refundAmount > order.total) {
      return NextResponse.json(
        { error: 'Refund amount exceeds order total' },
        { status: 400 }
      );
    }

    // For Square payments, initiate refund via Square API
    if (order.paymentMethod === 'SQUARE_ONLINE' && order.squarePaymentId) {
      try {
        const { getSquareClient } = await import('@/lib/square');
        const client = getSquareClient();
        
        await client.refunds.refundPayment({
          idempotencyKey: `refund-${orderNumber}-${Date.now()}`,
          paymentId: order.squarePaymentId,
          amountMoney: {
            amount: BigInt(Math.round(refundAmount * 100)),
            currency: 'USD',
          },
          reason,
        });
      } catch (squareError) {
        console.error('Square refund failed:', squareError);
        return NextResponse.json(
          { error: 'Square refund failed' },
          { status: 500 }
        );
      }
    }

    // Update order status
    order.status = 'REFUNDED';
    order.paymentStatus = 'REFUNDED';
    order.refundAmount = refundAmount;
    order.refundReason = reason;
    order.refundedAt = new Date();
    await order.save();

    // Return inventory to stock
    if (order.items?.length > 0) {
      const today = order.createdAt.toISOString().split('T')[0];
      
      for (const item of order.items) {
        await DailyInventory.updateOne(
          {
            marketId: order.marketId,
            date: { $gte: new Date(today), $lt: new Date(today + 'T23:59:59') },
            'items.productId': item.productId,
          },
          {
            $inc: { 'items.$.soldCount': -item.quantity },
            $set: { 'items.$.isSoldOut': false }
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        orderNumber: order.orderNumber,
        status: 'REFUNDED',
        refundAmount,
        reason,
      },
    });
  } catch (error) {
    console.error('Refund error:', error);
    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    );
  }
}
