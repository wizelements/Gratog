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
 * 
 * SECURITY HARDENED VERSION - Fixes applied:
 * 1. Stable idempotency key per order (prevents double-charge on retry)
 * 2. Pre-payment check for existing successful payment
 * 3. Fail fast when order not found (no orphan payments)
 * 4. Atomic status transition before calling Square (prevents race conditions)
 * 5. Amount mismatch blocking for significant differences
 * 6. Email deduplication with emailSentAt flag
 * 7. Coupon failure logged as error
 */

// Status precedence for safe transitions (higher = more final)
const STATUS_PRECEDENCE: Record<string, number> = {
  'pending': 1,
  'payment_processing': 2,
  'processing': 2,
  'paid': 3,
  'COMPLETED': 3,
  'completed': 3,
  'payment_completed': 3,
  'refunded': 4,
  'cancelled': 5
};

// Paid statuses that should block new payment attempts
const PAID_STATUSES = ['paid', 'COMPLETED', 'completed', 'payment_completed'];

// Final statuses that should block any payment attempt (paid, refunded, cancelled)
const FINAL_STATUSES = [...PAID_STATUSES, 'refunded', 'cancelled'];

// Pre-payment states that are valid for starting a new payment
const PRE_PAYMENT_STATES = ['pending', 'payment_failed'];

export async function POST(request: NextRequest) {
  const ctx = new RequestContext();
  const json = (payload: Record<string, unknown>, status = 200) =>
    NextResponse.json({ ...payload, traceId: ctx.traceId }, { status });

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
      idempotencyKey: clientIdempotencyKey,
      metadata = {}
    } = body;
    
    // ========================================================================
    // VALIDATION: Required fields
    // ========================================================================
    if (!sourceId) {
      return json({ success: false, error: 'Payment source ID (token) is required' }, 400);
    }
    
    if (!amountCents || amountCents <= 0) {
      return json({ success: false, error: 'Valid amount is required' }, 400);
    }

    if (!orderId) {
      return json({ success: false, error: 'Order ID is required for payment processing' }, 400);
    }
    
    logger.debug('API', 'Payment request received', {
      traceId: ctx.traceId,
      orderId,
      amountCents
    });
    
    // ========================================================================
    // DATABASE CONNECTION (fail fast if unavailable)
    // ========================================================================
    let db;
    try {
      const dbConnection = await connectToDatabase();
      db = dbConnection.db;
    } catch (dbConnError) {
      logger.error('API', 'Database connection failed - cannot process payment safely', {
        traceId: ctx.traceId,
        error: dbConnError instanceof Error ? dbConnError.message : String(dbConnError)
      });
      
      Sentry.captureException(dbConnError, {
        tags: { api: 'payments', stage: 'db_connect' }
      });
      
      return json(
        { 
          success: false, 
          error: 'Payment system temporarily unavailable. Please try again in a moment.',
          code: 'DB_UNAVAILABLE'
        },
        500
      );
    }
    
    // ========================================================================
    // FIX #2: CHECK FOR EXISTING SUCCESSFUL PAYMENT
    // Prevents double-charges if previous attempt succeeded but response failed
    // ========================================================================
    try {
      const existingPayment = await db.collection('payments').findOne({
        'metadata.orderId': orderId,
        status: { $in: ['COMPLETED', 'APPROVED'] }
      });
      
      if (existingPayment) {
        logger.info('API', 'Returning existing successful payment (idempotency protection)', {
          traceId: ctx.traceId,
          orderId,
          existingPaymentId: existingPayment.squarePaymentId
        });
        
        return json({
          success: true,
          payment: {
            id: existingPayment.squarePaymentId,
            status: existingPayment.status,
            amountCents: existingPayment.amountCents,
            currency: existingPayment.currency || 'USD',
            receiptUrl: existingPayment.receiptUrl,
            cardLast4: existingPayment.cardLast4,
            cardBrand: existingPayment.cardBrand
          },
          orderId,
          message: 'Payment already completed for this order',
          _cached: true
        });
      }
    } catch (paymentLookupError) {
      // Non-blocking - continue with payment attempt
      logger.warn('API', 'Payment lookup failed, continuing', { 
        error: paymentLookupError instanceof Error ? paymentLookupError.message : String(paymentLookupError) 
      });
    }
    
    // ========================================================================
    // FIX #3: FETCH ORDER (fail fast if not found)
    // No more orphan payments - order MUST exist
    // ========================================================================
    let order = await db.collection('orders').findOne({ id: orderId }) 
                || await db.collection('orders').findOne({ _id: orderId });
    
    if (!order) {
      logger.error('API', 'Order not found - blocking payment to prevent orphan charge', { 
        traceId: ctx.traceId,
        orderId 
      });
      
      Sentry.captureMessage('Payment attempted for non-existent order', {
        level: 'warning',
        tags: { api: 'payments', issue: 'order_not_found' },
        extra: { orderId, traceId: ctx.traceId }
      });
      
      return json(
        { 
          success: false, 
          error: 'Order not found. Please refresh and try again, or contact support if the issue persists.',
          code: 'ORDER_NOT_FOUND'
        },
        404
      );
    }
    
    // ========================================================================
    // DOUBLE-CHARGE PREVENTION: Check if order is in a final state
    // Includes paid, refunded, cancelled
    // ========================================================================
    if (FINAL_STATUSES.includes(order.status) || FINAL_STATUSES.includes(order.paymentStatus)) {
      const isPaid = PAID_STATUSES.includes(order.status) || PAID_STATUSES.includes(order.paymentStatus);
      const errorMessage = isPaid 
        ? 'This order has already been paid.'
        : 'This order has been cancelled or refunded. Please create a new order.';
      
      logger.warn('API', 'Payment blocked: Order in final state', { 
        traceId: ctx.traceId,
        orderId, 
        status: order.status,
        paymentStatus: order.paymentStatus,
        existingPaymentId: order.squarePaymentId
      });
      
      return json(
        { 
          success: false, 
          error: errorMessage,
          alreadyPaid: isPaid,
          orderStatus: order.status,
          orderId,
          existingPaymentId: order.squarePaymentId
        },
        409
      );
    }
    
    // ========================================================================
    // SERVER-AUTHORITATIVE IDEMPOTENCY KEY
    // Use stored key if exists, otherwise generate stable key from orderId
    // This ensures ALL attempts for this order use the SAME key
    // ========================================================================
    const serverStableKey = `pay_${orderId.slice(0, 36)}`;
    const paymentIdempotencyKey = order.paymentIdempotencyKey || serverStableKey;
    const orderIdempotencyKey = `sqord_${orderId.slice(0, 36)}`;
    
    logger.debug('API', 'Using idempotency key', {
      traceId: ctx.traceId,
      paymentIdempotencyKey,
      isExisting: !!order.paymentIdempotencyKey
    });
    
    // ========================================================================
    // FIX #4: ATOMIC STATUS TRANSITION (prevent race conditions)
    // CRITICAL: Only allow transition from PRE_PAYMENT_STATES
    // This ensures only ONE concurrent request can claim this order
    // ========================================================================
    const atomicTransition = await db.collection('orders').updateOne(
      { 
        id: orderId, 
        status: { $in: PRE_PAYMENT_STATES },
        paymentStatus: { $in: PRE_PAYMENT_STATES }
      },
      {
        $set: {
          status: 'payment_processing',
          paymentStatus: 'processing',
          paymentAttemptedAt: new Date().toISOString(),
          paymentIdempotencyKey: paymentIdempotencyKey,
          updatedAt: new Date().toISOString()
        }
      }
    );
    
    if (atomicTransition.matchedCount === 0) {
      // Another request already moved this order - check current status
      const refreshedOrder = await db.collection('orders').findOne({ id: orderId });
      
      if (refreshedOrder && PAID_STATUSES.includes(refreshedOrder.status)) {
        logger.info('API', 'Race condition prevented: Order was paid by concurrent request', {
          traceId: ctx.traceId,
          orderId
        });
        
        return json(
          { 
            success: false, 
            error: 'This order has already been paid.',
            alreadyPaid: true,
            orderId
          },
          409
        );
      }
      
      if (refreshedOrder?.status === 'payment_processing') {
        logger.info('API', 'Payment already in progress by another request', {
          traceId: ctx.traceId,
          orderId
        });
        
        return json(
          { 
            success: false, 
            error: 'Payment is currently being processed. Please wait a moment.',
            code: 'PAYMENT_IN_PROGRESS'
          },
          409
        );
      }
    }
    
    // Refresh order data after atomic update
    order = await db.collection('orders').findOne({ id: orderId });
    
    // ========================================================================
    // FIX #5: AMOUNT VALIDATION (block significant mismatches)
    // ========================================================================
    const expectedAmountCents = order.totalCents || 
                          (order.pricing?.total ? Math.round(order.pricing.total * 100) : 0) ||
                          (order.total ? Math.round(order.total * 100) : 0);
    
    let validatedAmountCents = amountCents;
    
    if (expectedAmountCents && expectedAmountCents > 0) {
      const amountDifference = Math.abs(amountCents - expectedAmountCents);
      
      // Block if difference > $0.50 (50 cents) - potential tampering or bug
      if (amountDifference > 50) {
        logger.error('API', 'BLOCKED: Significant amount mismatch detected', { 
          traceId: ctx.traceId,
          orderId, 
          clientAmount: amountCents, 
          expectedAmount: expectedAmountCents,
          difference: amountDifference
        });
        
        Sentry.captureMessage('Payment amount mismatch blocked', {
          level: 'warning',
          tags: { api: 'payments', issue: 'amount_mismatch' },
          extra: { orderId, clientAmount: amountCents, expectedAmount: expectedAmountCents }
        });
        
        // Reset order status since we're not proceeding
        await db.collection('orders').updateOne(
          { id: orderId },
          { $set: { status: 'pending', paymentStatus: 'pending', updatedAt: new Date().toISOString() } }
        );
        
        return json(
          { 
            success: false, 
            error: 'Order total mismatch. Please refresh the page and try again.',
            code: 'AMOUNT_MISMATCH'
          },
          409
        );
      }
      
      // Warn for small differences but use server amount (authoritative)
      if (amountDifference > 1) {
        logger.warn('API', 'Minor payment amount mismatch (using server amount)', { 
          traceId: ctx.traceId,
          orderId, 
          clientAmount: amountCents, 
          expectedAmount: expectedAmountCents,
          difference: amountDifference
        });
      }
      
      validatedAmountCents = expectedAmountCents; // Server is authoritative
    } else {
      logger.warn('API', 'Order has no valid total, using client amount', {
        traceId: ctx.traceId,
        orderId,
        clientAmount: amountCents
      });
    }
    
    // ========================================================================
    // CUSTOMER HANDLING
    // ========================================================================
    const customerInfo = customer || order?.customer;
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
          logger.debug('API', `Customer ${customerResult.data.created ? 'created' : 'found'}`, { 
            customerId: squareCustomerId 
          });
        }
      } catch (custError) {
        logger.warn('API', 'Customer lookup failed, continuing without', { 
          error: custError instanceof Error ? custError.message : String(custError) 
        });
      }
    }
    
    // ========================================================================
    // SQUARE ORDER CREATION (if not already provided)
    // ========================================================================
    let squareOrderId = existingSquareOrderId || order.squareOrderId;
    
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
            orderNumber: order.orderNumber || '',
            customerEmail: customerInfo?.email || '',
            source: 'gratog_web'
          },
          idempotencyKey: orderIdempotencyKey
        });

        if (orderResult.success && orderResult.data?.order) {
          squareOrderId = orderResult.data.order.id;
          logger.debug('API', 'Square order created', { squareOrderId });
          
          // Store Square order ID for future reference
          await db.collection('orders').updateOne(
            { id: orderId },
            { $set: { squareOrderId, updatedAt: new Date().toISOString() } }
          );
        } else {
          logger.warn('API', 'Failed to create Square order, continuing', { 
            errors: orderResult.errors 
          });
        }
      } catch (orderError) {
        logger.warn('API', 'Square order creation failed, continuing', { 
          error: orderError instanceof Error ? orderError.message : String(orderError) 
        });
      }
    }
    
    // ========================================================================
    // PROCESS SQUARE PAYMENT
    // ========================================================================
    const noteText = `Order ${order.orderNumber || orderId}`;
    const truncatedNote = noteText.length > 45 ? noteText.substring(0, 45) : noteText;
    
    logger.info('API', 'Processing Square payment', {
      traceId: ctx.traceId,
      amountCents: validatedAmountCents,
      orderId,
      squareOrderId,
      idempotencyKey: paymentIdempotencyKey
    });
    
    const paymentResult = await createPayment({
      sourceId,
      amountCents: validatedAmountCents,
      currency,
      orderId: squareOrderId,
      customerId: squareCustomerId,
      note: truncatedNote,
      referenceId: orderId, // Local order ID for webhook mapping
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
      
      // Reset order status on failure
      await db.collection('orders').updateOne(
        { id: orderId },
        { 
          $set: { 
            status: 'payment_failed', 
            paymentStatus: 'failed',
            paymentError: errorDetail,
            paymentErrorCode: errorCode,
            updatedAt: new Date().toISOString() 
          } 
        }
      );

      const userMessage = getPaymentErrorMessage(errorCode, errorDetail);

      return json(
        { 
          success: false, 
          error: userMessage, 
          code: errorCode
        },
        400
      );
    }

    const payment = paymentResult.data.payment;
    const isCompleted = payment.status === 'COMPLETED' || payment.status === 'APPROVED';
    
    logger.info('API', 'Square payment completed', {
      traceId: ctx.traceId,
      duration: ctx.durationMs(),
      paymentId: payment.id,
      status: payment.status,
      amountMoney: payment.amountMoney,
      receiptUrl: payment.receiptUrl
    });
    
    // ========================================================================
    // PERSIST PAYMENT RECORD (for idempotency checks and audit)
    // ========================================================================
    try {
      const paymentData = {
        squarePaymentId: payment.id,
        status: payment.status,
        amountCents: payment.amountMoney?.amount,
        currency: payment.amountMoney?.currency,
        receiptUrl: payment.receiptUrl,
        receiptNumber: payment.receiptNumber,
        cardBrand: payment.cardDetails?.card?.cardBrand,
        cardLast4: payment.cardDetails?.card?.last4,
        metadata: {
          orderId,
          orderNumber: order.orderNumber,
          squareOrderId,
          squareCustomerId,
          customer: customerInfo ? {
            email: customerInfo.email,
            name: customerInfo.name,
            phone: customerInfo.phone
          } : null,
          customerEmail: customerInfo?.email,
          idempotencyKey: paymentIdempotencyKey,
          createdAt: new Date().toISOString(),
          traceId: ctx.traceId
        },
        idempotencyKey: `payment_record_${payment.id}`
      };
      
      await persistWithFallback(
        async () => {
          await db.collection('payment_records').insertOne(paymentData);
        },
        paymentData,
        { type: 'payment', id: payment.id }
      );
    } catch (persistError) {
      // Critical: Payment succeeded but record failed - alert
      logger.error('API', 'CRITICAL: Payment record persistence failed', { 
        paymentId: payment.id, 
        orderId,
        error: persistError instanceof Error ? persistError.message : String(persistError) 
      });
      
      Sentry.captureException(persistError, {
        tags: { api: 'payments', severity: 'critical', issue: 'payment_record_failed' },
        extra: { paymentId: payment.id, orderId }
      });
    }
    
    // ========================================================================
    // UPDATE ORDER STATUS
    // ========================================================================
    try {
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
      logger.error('API', 'Order status update failed after successful payment', { 
        orderId,
        paymentId: payment.id,
        error: updateError instanceof Error ? updateError.message : String(updateError) 
      });
      
      Sentry.captureException(updateError, {
        tags: { api: 'payments', severity: 'high', issue: 'order_update_failed' },
        extra: { paymentId: payment.id, orderId }
      });
    }
    
    // ========================================================================
    // FIX #6: SEND EMAIL WITH ATOMIC DEDUPLICATION
    // Claim the right to send email atomically BEFORE sending
    // This prevents race conditions between API and webhooks
    // ========================================================================
    try {
      if (customerInfo?.email && isCompleted) {
        // ATOMIC CLAIM: Only one process can claim email sending rights
        const emailClaimTime = new Date().toISOString();
        const emailClaim = await db.collection('orders').updateOne(
          { 
            id: orderId, 
            emailSentAt: { $exists: false } // Only if no email sent yet
          },
          { 
            $set: { emailSentAt: emailClaimTime } 
          }
        );
        
        if (emailClaim.modifiedCount === 0) {
          // Another process already claimed or sent email
          logger.debug('API', 'Email already sent/claimed by another process, skipping', { orderId });
        } else {
          // We won the claim - send email now
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
            logger.warn('API', 'Order confirmation email failed after claim', { 
              orderId, 
              error: emailResult.error 
            });
            // Note: emailSentAt is already set, so email won't be retried automatically
            // This is intentional to prevent spam; manual resend can be triggered if needed
          }
        }
      }
    } catch (notifyError) {
      logger.warn('API', 'Notification failed', { 
        orderId,
        error: notifyError instanceof Error ? notifyError.message : String(notifyError) 
      });
    }
    
    // ========================================================================
    // REWARDS SYSTEM
    // ========================================================================
    try {
      if (customerInfo?.email && isCompleted && rewardsSystem) {
        const pointsToAward = Math.ceil(validatedAmountCents / 100);
        await rewardsSystem.addPoints(
          customerInfo.email,
          pointsToAward,
          'purchase',
          { orderId, amountCents: validatedAmountCents }
        );
      }
    } catch (rewardsError) {
      logger.warn('API', 'Rewards failed', { 
        error: rewardsError instanceof Error ? rewardsError.message : String(rewardsError) 
      });
    }
    
    // ========================================================================
    // FIX #7: MARK COUPON AS USED (with error-level logging on failure)
    // ========================================================================
    try {
      if (order?.coupon?.code && isCompleted) {
        const couponResult = await db.collection('coupons').updateOne(
          { code: order.coupon.code.toUpperCase(), isUsed: false },
          { 
            $set: { 
              isUsed: true, 
              usedAt: new Date().toISOString(),
              orderId,
              paymentId: payment.id
            } 
          }
        );
        
        if (couponResult.modifiedCount > 0) {
          logger.info('API', 'Coupon marked as used', { code: order.coupon.code, orderId });
        } else {
          logger.warn('API', 'Coupon already used or not found', { code: order.coupon.code, orderId });
        }
      }
    } catch (couponError) {
      // CRITICAL: Coupon might be reused - log as error and alert
      logger.error('API', 'CRITICAL: Failed to mark coupon as used - possible reuse risk', { 
        orderId,
        couponCode: order?.coupon?.code,
        error: couponError instanceof Error ? couponError.message : String(couponError) 
      });
      
      Sentry.captureException(couponError, {
        tags: { api: 'payments', severity: 'high', issue: 'coupon_not_marked_used' },
        extra: { orderId, couponCode: order?.coupon?.code, paymentId: payment.id }
      });
    }
    
    // ========================================================================
    // SUCCESS RESPONSE
    // ========================================================================
    return json({
      success: true,
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
      orderNumber: order.orderNumber,
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
    
    return json(
      {
        success: false,
        error: 'Payment processing failed. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
}

// GET endpoint to retrieve payment status
export async function GET(request: NextRequest) {
  const ctx = new RequestContext();
  const json = (payload: Record<string, unknown>, status = 200) =>
    NextResponse.json({ ...payload, traceId: ctx.traceId }, { status });

  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');
    const orderId = searchParams.get('orderId');
    
    if (!paymentId && !orderId) {
      return json({ error: 'Payment ID or Order ID is required' }, 400);
    }

    if (paymentId) {
      const result = await getSquarePayment(paymentId);
      if (!result.success) {
        return json({ error: 'Payment not found' }, 404);
      }

      const payment = result.data?.payment;
      return json({
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
        return json({ error: 'Order not found' }, 404);
      }

      return json({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          squarePaymentId: order.squarePaymentId,
          paidAt: order.paidAt,
          receiptUrl: order.receiptUrl
        }
      });
    }

  } catch (error) {
    console.error('[Payment GET] Error:', error);
    return json({ error: 'Failed to retrieve payment status' }, 500);
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
    'IDEMPOTENCY_KEY_REUSED': 'This payment was already processed. Please check your order status.',
  };

  return errorMap[code] || detail || 'Payment could not be processed. Please try again.';
}
