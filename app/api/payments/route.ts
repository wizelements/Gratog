import { logger } from '@/lib/logger';
import { RequestContext } from '@/lib/request-context';
import { NextRequest, NextResponse } from 'next/server';
import { createPayment, getPayment as getSquarePayment, findOrCreateCustomer, createOrder as createSquareOrder, getSquareConfig } from '@/lib/square-api';
import { connectToDatabase } from '@/lib/db-optimized';
import { randomUUID } from 'crypto';
import * as Sentry from '@sentry/nextjs';
import { 
  persistWithFallback, 
  criticalAlert,
  withRetry 
} from '@/lib/critical-operations';
import { rewardsSystem } from '@/lib/enhanced-rewards';
import { sendOrderConfirmationEmail } from '@/lib/resend-email';

/**
 * Square Payments API - Web Payments SDK Integration
 * FIXED: Uses direct REST API (like working TOG) instead of SDK
 * FIXED: Fresh idempotency key per attempt
 * FIXED: Relaxed validation (warns instead of blocking)
 */
export async function POST(request: NextRequest) {
  const ctx = new RequestContext();
  
  try {
    const body = await request.json();
    const { 
      sourceId,
      amountCents,
      currency = 'USD',
      orderId,
      squareOrderId: existingSquareOrderId,
      customer,
      lineItems = [],
      idempotencyKey,
      metadata = {}
    } = body;
    
    // Validate required fields
    if (!sourceId) {
      return NextResponse.json(
        { success: false, error: 'Payment source ID (token) is required' },
        { status: 400 }
      );
    }
    
    if (!amountCents || amountCents <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid amount is required' },
        { status: 400 }
      );
    }
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required for payment processing' },
        { status: 400 }
      );
    }
    
    // FIXED: Generate fresh idempotency key per attempt (like TOG)
    // Old broken code used: `payment_${orderId}_${order.orderNumber}` which blocked retries
    const paymentIdempotencyKey = idempotencyKey || `pay_${orderId.slice(0, 32)}_${Date.now().toString(36)}`;
    const orderIdempotencyKey = `order_${paymentIdempotencyKey}`;
    
    // Fetch order for validation (non-blocking)
    let order: any = null;
    let validatedAmountCents = amountCents;
    
    try {
      const { db } = await connectToDatabase();
      order = await db.collection('orders').findOne({ id: orderId }) 
              || await db.collection('orders').findOne({ _id: orderId });
      
      if (!order) {
        logger.warn('API', 'Order not found, proceeding with payment anyway', { orderId });
        // Don't block - proceed with client-provided amount
      } else {
        // Double-charge prevention (keep this)
        const paidStatuses = ['paid', 'COMPLETED', 'completed', 'payment_completed'];
        if (paidStatuses.includes(order.status) || paidStatuses.includes(order.paymentStatus)) {
          logger.warn('API', 'Double-charge prevention: Order already paid', { 
            orderId, 
            status: order.status,
            paymentStatus: order.paymentStatus 
          });
          return NextResponse.json(
            { 
              success: false, 
              error: 'This order has already been paid.',
              alreadyPaid: true,
              orderId
            },
            { status: 409 }
          );
        }
        
        // FIXED: Relaxed amount validation - warn but don't block
        const expectedAmountCents = order.totalCents || 
                              (order.pricing?.total ? Math.round(order.pricing.total * 100) : 0) ||
                              (order.total ? Math.round(order.total * 100) : 0);
        
        if (expectedAmountCents && expectedAmountCents > 0) {
          const amountDifference = Math.abs(amountCents - expectedAmountCents);
          if (amountDifference > 1) {
            // WARN but don't block (like TOG)
            logger.warn('API', 'Payment amount mismatch (proceeding anyway)', { 
              orderId, 
              clientAmount: amountCents, 
              expectedAmount: expectedAmountCents,
              difference: amountDifference
            });
          }
          validatedAmountCents = expectedAmountCents;
        } else {
          logger.warn('API', 'Order has no valid total, using client amount', {
            orderId,
            clientAmount: amountCents
          });
          validatedAmountCents = amountCents;
        }
      }
    } catch (dbError) {
      logger.warn('API', 'Database error during order lookup, proceeding with payment', { 
        orderId, 
        error: dbError instanceof Error ? dbError.message : String(dbError) 
      });
      // Don't block - proceed with client-provided amount
    }
    
    // Use customer from order if not provided in request
    const customerInfo = customer || order?.customer;
    
    // Find or create Square customer
    let squareCustomerId: string | undefined;
    if (customerInfo?.email) {
      try {
        const customerResult = await findOrCreateCustomer({
          email: customerInfo.email,
          givenName: customerInfo.name?.split(' ')[0]?.slice(0, 45),
          familyName: customerInfo.name?.split(' ').slice(1).join(' ')?.slice(0, 45),
          phoneNumber: customerInfo.phone,
          referenceId: `gratog_${orderId.slice(0, 35)}`
        });

        if (customerResult.success && customerResult.data?.customer) {
          squareCustomerId = customerResult.data.customer.id;
          logger.debug('API', `Customer ${customerResult.data.created ? 'created' : 'found'}`, { customerId: squareCustomerId });
        }
      } catch (custError) {
        logger.warn('API', 'Customer lookup failed, continuing without', { error: custError });
      }
    }
    
    // Create Square order if not provided
    let squareOrderId = existingSquareOrderId;
    
    if (!squareOrderId) {
      const squareLineItems = lineItems.length > 0 
        ? lineItems.map((item: { catalogObjectId?: string; name?: string; quantity: number; priceInCents?: number }) => ({
            catalogObjectId: item.catalogObjectId && item.catalogObjectId.length > 20 ? item.catalogObjectId : undefined,
            name: item.name || 'Item',
            quantity: String(item.quantity || 1),
            basePriceMoney: { amount: item.priceInCents || 0, currency }
          }))
        : [{
            name: 'Order Payment',
            quantity: '1',
            basePriceMoney: { amount: validatedAmountCents, currency }
          }];

      try {
        const orderResult = await createSquareOrder({
          referenceId: orderId,
          customerId: squareCustomerId,
          lineItems: squareLineItems,
          metadata: {
            localOrderId: orderId,
            customerEmail: customerInfo?.email || '',
            source: 'gratog_web'
          },
          idempotencyKey: orderIdempotencyKey
        });

        if (orderResult.success && orderResult.data?.order) {
          squareOrderId = orderResult.data.order.id;
          logger.debug('API', 'Square order created', { squareOrderId });
        } else {
          logger.warn('API', 'Failed to create Square order, continuing', { errors: orderResult.errors });
        }
      } catch (orderError) {
        logger.warn('API', 'Square order creation failed, continuing', { error: orderError });
      }
    }
    
    // Truncate note to Square's limit
    const noteText = `Order ${order?.orderNumber || orderId}`;
    const truncatedNote = noteText.length > 45 ? noteText.substring(0, 45) : noteText;
    
    logger.debug('API', 'Processing Square payment via REST API', {
      traceId: ctx.traceId,
      amountCents: validatedAmountCents,
      orderId,
      squareOrderId,
      idempotencyKey: paymentIdempotencyKey
    });
    
    // FIXED: Use direct REST API (like working TOG) instead of SDK
    const paymentResult = await createPayment({
      sourceId,
      amountCents: validatedAmountCents,
      currency,
      orderId: squareOrderId,
      customerId: squareCustomerId,
      note: truncatedNote,
      referenceId: orderId,
      buyerEmailAddress: customerInfo?.email,
      idempotencyKey: paymentIdempotencyKey
    });

    if (!paymentResult.success || !paymentResult.data?.payment) {
      const errorDetail = paymentResult.errors?.[0]?.detail || 'Payment processing failed';
      const errorCode = paymentResult.errors?.[0]?.code || 'UNKNOWN';

      logger.error('API', 'Square payment failed', {
        traceId: ctx.traceId,
        errorCode,
        errorDetail,
        errors: paymentResult.errors
      });

      const userMessage = getPaymentErrorMessage(errorCode, errorDetail);

      return NextResponse.json(
        { success: false, error: userMessage, code: errorCode, traceId: ctx.traceId },
        { status: 400 }
      );
    }

    const payment = paymentResult.data.payment;
    
    logger.debug('API', 'Square payment completed', {
      traceId: ctx.traceId,
      duration: ctx.durationMs(),
      paymentId: payment.id,
      status: payment.status,
      amountMoney: payment.amountMoney,
      receiptUrl: payment.receiptUrl
    });
    
    // Store payment record (best-effort, don't block on failure)
    const paymentRecordId = randomUUID();
    try {
      await persistWithFallback({
        collection: 'payments',
        data: {
          id: paymentRecordId,
          squarePaymentId: payment.id,
          orderId,
          squareOrderId,
          squareCustomerId,
          status: payment.status,
          amountCents: payment.amountMoney?.amount,
          currency: payment.amountMoney?.currency,
          receiptUrl: payment.receiptUrl,
          receiptNumber: payment.receiptNumber,
          cardDetails: payment.cardDetails ? {
            last4: payment.cardDetails.card?.last4,
            brand: payment.cardDetails.card?.cardBrand
          } : null,
          customerEmail: customerInfo?.email,
          createdAt: new Date().toISOString(),
          traceId: ctx.traceId
        },
        idempotencyKey: `payment_record_${payment.id}`
      });
    } catch (persistError) {
      logger.warn('API', 'Payment record persistence failed', { 
        paymentId: payment.id, 
        error: persistError instanceof Error ? persistError.message : String(persistError) 
      });
    }
    
    // Update order status (best-effort)
    const isCompleted = payment.status === 'COMPLETED' || payment.status === 'APPROVED';
    if (order) {
      try {
        const { db } = await connectToDatabase();
        await db.collection('orders').updateOne(
          { id: orderId },
          { 
            $set: {
              status: isCompleted ? 'paid' : 'payment_processing',
              paymentStatus: isCompleted ? 'paid' : 'processing',
              squarePaymentId: payment.id,
              squareOrderId,
              squareCustomerId,
              paidAt: isCompleted ? new Date().toISOString() : undefined,
              receiptUrl: payment.receiptUrl,
              cardBrand: payment.cardDetails?.card?.cardBrand,
              cardLast4: payment.cardDetails?.card?.last4,
              updatedAt: new Date().toISOString()
            }
          }
        );
      } catch (updateError) {
        logger.warn('API', 'Order status update failed', { 
          orderId, 
          error: updateError instanceof Error ? updateError.message : String(updateError) 
        });
      }
    }
    
    // Send order confirmation email (best-effort)
    try {
      if (customerInfo?.email && isCompleted && order) {
        const emailResult = await sendOrderConfirmationEmail({
          id: orderId,
          orderNumber: order.orderNumber || orderId,
          customer: {
            email: customerInfo.email,
            name: customerInfo.name || 'Customer',
            phone: customerInfo.phone
          },
          items: order.items || [],
          pricing: {
            subtotal: order.pricing?.subtotal || validatedAmountCents / 100,
            total: validatedAmountCents / 100,
            deliveryFee: order.pricing?.deliveryFee || 0,
            tax: order.pricing?.tax || 0
          },
          fulfillment: order.fulfillment || { type: 'pickup' },
          payment: {
            receiptUrl: payment.receiptUrl,
            cardBrand: payment.cardDetails?.card?.cardBrand,
            cardLast4: payment.cardDetails?.card?.last4
          }
        });
        
        if (emailResult.success) {
          logger.info('API', 'Order confirmation email sent', { orderId, to: customerInfo.email });
        } else {
          logger.warn('API', 'Order confirmation email failed', { orderId, error: emailResult.error });
        }
      }
    } catch (notifyError) {
      logger.warn('API', 'Notification failed', { 
        orderId,
        error: notifyError instanceof Error ? notifyError.message : String(notifyError) 
      });
    }
    
    try {
      if (customerInfo?.email && isCompleted && rewardsSystem) {
        await rewardsSystem.awardPoints({
          customerEmail: customerInfo.email,
          orderId,
          amountCents: validatedAmountCents,
          source: 'purchase'
        });
      }
    } catch (rewardsError) {
      logger.warn('API', 'Rewards failed', { error: rewardsError });
    }
    
    // Mark coupon as used (best-effort) - prevents reuse
    try {
      if (order?.coupon?.code && isCompleted) {
        const { db } = await connectToDatabase();
        await db.collection('coupons').updateOne(
          { code: order.coupon.code.toUpperCase(), isUsed: false },
          { 
            $set: { 
              isUsed: true, 
              usedAt: new Date().toISOString(),
              orderId 
            } 
          }
        );
        logger.debug('API', 'Coupon marked as used', { code: order.coupon.code, orderId });
      }
    } catch (couponError) {
      logger.warn('API', 'Failed to mark coupon as used', { 
        orderId, 
        error: couponError instanceof Error ? couponError.message : String(couponError) 
      });
    }
    
    return NextResponse.json({
      success: true,
      traceId: ctx.traceId,
      payment: {
        id: payment.id,
        status: payment.status,
        amountCents: payment.amountMoney?.amount,
        currency: payment.amountMoney?.currency,
        receiptUrl: payment.receiptUrl,
        receiptNumber: payment.receiptNumber,
        cardLast4: payment.cardDetails?.card?.last4,
        cardBrand: payment.cardDetails?.card?.cardBrand
      },
      orderId,
      message: 'Payment processed successfully'
    });
    
  } catch (error) {
    console.error('[Payment] Error:', error);
    
    Sentry.captureException(error, {
      tags: { api: 'payments', component: 'square_payment' },
      contexts: { payment: { traceId: ctx.traceId, duration: ctx.durationMs() } }
    });
    
    logger.error('API', 'Payment processing failed', {
      traceId: ctx.traceId,
      duration: ctx.durationMs(),
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Payment processing failed. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error',
        traceId: ctx.traceId
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve payment status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');
    const orderId = searchParams.get('orderId');
    
    if (!paymentId && !orderId) {
      return NextResponse.json(
        { error: 'Payment ID or Order ID is required' },
        { status: 400 }
      );
    }
    
    if (paymentId) {
      const result = await getSquarePayment(paymentId);
      if (!result.success) {
        return NextResponse.json(
          { error: 'Payment not found' },
          { status: 404 }
        );
      }
      
      const payment = result.data?.payment;
      return NextResponse.json({ 
        success: true, 
        payment: {
          id: payment?.id,
          status: payment?.status,
          amountCents: payment?.amountMoney?.amount,
          currency: payment?.amountMoney?.currency,
          receiptUrl: payment?.receiptUrl,
          cardLast4: payment?.cardDetails?.card?.last4,
          cardBrand: payment?.cardDetails?.card?.cardBrand
        }
      });
    }

    if (orderId) {
      const { db } = await connectToDatabase();
      const order = await db.collection('orders').findOne({ id: orderId });
      
      if (!order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ 
        success: true, 
        order: {
          id: order.id,
          status: order.status,
          paymentStatus: order.paymentStatus,
          squarePaymentId: order.squarePaymentId
        }
      });
    }

  } catch (error) {
    console.error('[Payment GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve payment status' },
      { status: 500 }
    );
  }
}

function getPaymentErrorMessage(code: string, detail: string): string {
  const errorMap: Record<string, string> = {
    'CARD_DECLINED': 'Your card was declined. Please try a different payment method.',
    'CVV_FAILURE': 'The CVV code is incorrect. Please check and try again.',
    'INVALID_EXPIRATION': 'The card expiration date is invalid.',
    'INSUFFICIENT_FUNDS': 'Insufficient funds. Please try a different card.',
    'CARD_NOT_SUPPORTED': 'This card type is not supported.',
    'INVALID_CARD': 'Invalid card details. Please check and try again.',
    'GENERIC_DECLINE': 'Payment declined. Please try a different payment method.',
    'INVALID_POSTAL_CODE': 'The postal code does not match the card.',
    'INVALID_ACCOUNT': 'The card account is invalid.',
    'CARD_EXPIRED': 'This card has expired. Please use a different card.',
    'BAD_EXPIRATION': 'The expiration date is invalid.',
    'PAN_FAILURE': 'Invalid card number. Please check and try again.',
    'ADDRESS_VERIFICATION_FAILURE': 'Address verification failed. Please check your billing address.',
  };

  return errorMap[code] || detail || 'Payment could not be processed. Please try again.';
}
