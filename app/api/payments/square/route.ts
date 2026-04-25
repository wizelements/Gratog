import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import MarketOrder from '@/models/MarketOrder';
import DailyInventory from '@/models/DailyInventory';
import { getSquareClient, getSquareLocationId } from '@/lib/square';
import { sendOrderConfirmation, sendOrderReady } from '@/lib/sms';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

export const runtime = 'nodejs';

/**
 * Verify Square webhook signature
 */
function verifySquareWebhookSignature(
  body: string,
  signature: string,
  signatureKey: string
): boolean {
  if (!signature || !signatureKey) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', signatureKey);
  hmac.update(body);
  const computedSignature = hmac.digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'base64'),
    Buffer.from(computedSignature, 'base64')
  );
}

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

/**
 * POST /api/payments/square/webhook
 * Handle Square payment webhooks with signature verification
 */
export async function PUT(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-square-signature');
    const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

    // Verify webhook signature
    if (!signature || !signatureKey) {
      console.error('Missing signature or key');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const isValid = verifySquareWebhookSignature(body, signature, signatureKey);
    if (!isValid) {
      console.error('Webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse body after verification
    const event = JSON.parse(body);
    const { type, data } = event;

    console.log(`Received Square webhook: ${type}`);

    await connectToDatabase();

    // Handle payment events
    if (type === 'payment.updated' || type === 'payment.completed') {
      const squarePaymentId = data.object?.payment?.orderId || data.object?.payment?.id;
      const status = data.object?.payment?.status;
      const paymentAmount = data.object?.payment?.amountMoney?.amount;

      console.log(`Payment ${squarePaymentId} status: ${status}`);

      if (squarePaymentId && (status === 'COMPLETED' || status === 'APPROVED')) {
        // Find order by Square payment ID
        const order = await MarketOrder.findOneAndUpdate(
          { squarePaymentId },
          {
            $set: {
              status: 'CONFIRMED',
              paymentStatus: 'PAID',
              paidAt: new Date(),
              squarePaymentDetails: {
                paymentId: data.object.payment.id,
                receiptUrl: data.object.payment.receiptUrl,
                processingFee: data.object.payment.processingFee?.amount,
              }
            },
          },
          { new: true }
        );

        if (order) {
          console.log(`Order ${order.orderNumber} marked as paid`);
          
          // Send confirmation SMS
          try {
            await sendOrderConfirmation(order.customerPhone, {
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              total: order.total,
              estimatedMinutes: order.estimatedMinutes || 15,
            });
          } catch (smsError) {
            console.error('SMS confirmation failed:', smsError);
          }

          // Send admin notification
          try {
            const { sendAdminNotification } = await import('@/lib/sms');
            await sendAdminNotification({
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              total: order.total,
              items: order.items,
            });
          } catch (adminError) {
            console.error('Admin notification failed:', adminError);
          }
        } else {
          console.error(`Order not found for payment ${squarePaymentId}`);
        }
      }
    }

    // Handle refund events
    if (type === 'refund.created' || type === 'refund.updated') {
      const refundId = data.object?.refund?.id;
      const paymentId = data.object?.refund?.paymentId;
      const refundStatus = data.object?.refund?.status;
      const refundAmount = data.object?.refund?.amountMoney?.amount;

      console.log(`Refund ${refundId} status: ${refundStatus}`);

      if (refundStatus === 'COMPLETED' && paymentId) {
        // Find order by Square payment ID
        const order = await MarketOrder.findOne({ 
          'squarePaymentDetails.paymentId': paymentId 
        });

        if (order) {
          // Check if full or partial refund
          const refundTotal = Number(refundAmount) / 100;
          const isFullRefund = refundTotal >= order.total;

          await MarketOrder.findByIdAndUpdate(order._id, {
            $set: {
              refundStatus: 'COMPLETED',
              refundAmount: refundTotal,
              status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
              paymentStatus: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
            }
          });

          // Return inventory if full refund
          if (isFullRefund && order.items?.length > 0) {
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

          console.log(`Order ${order.orderNumber} refund processed: $${refundTotal}`);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Square webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
