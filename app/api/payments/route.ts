
import { logger } from '@/lib/logger';
import { RequestContext } from '@/lib/request-context';
import { NextRequest, NextResponse } from 'next/server';
import { getSquareClient, getSquareLocationId } from '@/lib/square';
import { connectToDatabase } from '@/lib/db-optimized';
import { randomUUID } from 'crypto';
import { fromCents, toSquareMoney } from '@/lib/money';
import { shouldAllowFallback, getAuthFailureResponse, logSquareOperation } from '@/lib/square-guard';
import { findOrCreateSquareCustomer, createCustomerNote } from '@/lib/square-customer';
import * as Sentry from '@sentry/nextjs';
import { 
  persistWithFallback, 
  sendNotificationReliably, 
  criticalAlert,
  safeStringify,
  withRetry 
} from '@/lib/critical-operations';
import { rewardsSystem } from '@/lib/enhanced-rewards';

/**
 * Square Payments API - Web Payments SDK Integration
 * Processes tokenized payment methods from the Web Payments SDK for in-page checkout
 */
export async function POST(request: NextRequest) {
  const ctx = new RequestContext();
  
  try {
    const body = await request.json();
    const { 
      sourceId, // Payment token from Web Payments SDK
      amountCents,
      currency = 'USD',
      orderId,
      squareOrderId, // Square Order ID to link payment
      customer,
      lineItems,
      idempotencyKey,
      metadata = {}
    } = body;
    
    // Validate required fields
    if (!sourceId) {
      return NextResponse.json(
        { error: 'Payment source ID (token) is required' },
        { status: 400 }
      );
    }
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required for payment processing' },
        { status: 400 }
      );
    }
    
    // SECURITY FIX: Validate amount server-side and prevent double-charging
    // Fetch the order from database to verify amount and payment status
    let order: any = null;
    let expectedAmountCents: number;
    
    try {
      const { db } = await connectToDatabase();
      order = await db.collection('orders').findOne({ id: orderId });
      
      if (!order) {
        logger.warn('API', 'Payment attempted for non-existent order', { orderId });
        return NextResponse.json(
          { success: false, error: 'Order not found. Please try again or contact support.' },
          { status: 404 }
        );
      }
      
      // CRITICAL: Check if order is already paid to prevent double-charging
      const paidStatuses = ['paid', 'COMPLETED', 'completed'];
      if (paidStatuses.includes(order.status) || paidStatuses.includes(order.paymentStatus)) {
        logger.warn('API', 'Double-charge prevention: Order already paid', { 
          orderId, 
          status: order.status,
          paymentStatus: order.paymentStatus 
        });
        return NextResponse.json(
          { 
            success: false, 
            error: 'This order has already been paid. Please contact support if this is unexpected.',
            alreadyPaid: true,
            orderId
          },
          { status: 409 }
        );
      }
      
      // Calculate expected amount from order (server-side validation)
      // Use order.pricing.total (in dollars) converted to cents, or totalCents if stored
      expectedAmountCents = order.totalCents || 
                            (order.pricing?.total ? Math.round(order.pricing.total * 100) : 0) ||
                            (order.total ? Math.round(order.total * 100) : 0);
      
      if (!expectedAmountCents || expectedAmountCents <= 0) {
        logger.error('API', 'Order has invalid total amount', { orderId, order: order.pricing });
        return NextResponse.json(
          { success: false, error: 'Invalid order total. Please contact support.' },
          { status: 400 }
        );
      }
      
      // Allow small tolerance (1 cent) for rounding differences
      const amountDifference = Math.abs(amountCents - expectedAmountCents);
      if (amountDifference > 1) {
        logger.warn('API', 'Payment amount mismatch detected', { 
          orderId, 
          clientAmount: amountCents, 
          expectedAmount: expectedAmountCents,
          difference: amountDifference
        });
        return NextResponse.json(
          { 
            success: false, 
            error: 'Payment amount does not match order total. Please refresh and try again.',
            expectedAmountCents
          },
          { status: 400 }
        );
      }
      
      logger.debug('API', 'Order validated for payment', { 
        orderId, 
        expectedAmountCents, 
        clientAmountCents: amountCents 
      });
      
    } catch (dbError) {
      logger.error('API', 'Database error during payment validation', { 
        orderId, 
        error: dbError instanceof Error ? dbError.message : String(dbError) 
      });
      return NextResponse.json(
        { success: false, error: 'Unable to validate order. Please try again.' },
        { status: 500 }
      );
    }
    
    // Use server-validated amount (not client-provided)
    const validatedAmountCents = expectedAmountCents;
    
    // Generate idempotency key to prevent duplicate payments
    // Use order-specific key to ensure same order always uses same key
    const paymentIdempotencyKey = idempotencyKey || `payment_${orderId}_${order.orderNumber || orderId}`;
    
    // Get location ID with proper validation
    let locationId: string;
    try {
      locationId = getSquareLocationId();
    } catch (err) {
      logger.error('API', 'Square location ID not configured', { error: err });
      return NextResponse.json(
        { error: 'Payment processing not configured. Please contact support.' },
        { status: 503 }
      );
    }
    
    // Log payment processing start
    logger.debug('API', 'Processing Square Web Payment:', {
      traceId: ctx.traceId,
      sourceId: sourceId?.substring(0, 20) + '...',
      validatedAmountCents, // Using server-validated amount
      clientAmountCents: amountCents,
      currency,
      locationId,
      idempotencyKey: paymentIdempotencyKey,
      orderId,
      squareOrderId
    });
    
    // Get fresh Square client instance
    const square = getSquareClient();
    
    // STEP 1: Create or find Square Customer (if customer info provided)
    let squareCustomerId: string | undefined;
    
    // Use customer from order if not provided in request
    const customerInfo = customer || order.customer;
    
    if (customerInfo && customerInfo.email && customerInfo.name) {
      logger.debug('API', 'Creating/finding Square customer for payment...');
      try {
        const customerResult = await findOrCreateSquareCustomer({
          email: customerInfo.email,
          name: customerInfo.name,
          phone: customerInfo.phone,
          note: createCustomerNote({
            orderNumber: order.orderNumber || orderId,
            source: 'web_payment_sdk'
          })
        });
        
        if (customerResult.success && customerResult.customer) {
          squareCustomerId = customerResult.customer.id;
          logger.debug('API', '✅ Square customer ready for payment', { customerId: squareCustomerId });
        } else {
          console.warn('Customer creation failed, continuing without customer link', { 
            error: customerResult.error 
          });
        }
      } catch (custError) {
        console.warn('Customer lookup error, continuing', { error: custError });
      }
    }
    
    // Truncate note to Square's 45 character limit (must be defined before use)
    const noteText = `Order ${order.orderNumber || orderId}`;
    const truncatedNote = noteText.length > 45 ? noteText.substring(0, 45) : noteText;
    
    logger.debug('API', 'Sending payment request to Square SDK...');
    
    // Use SDK directly with SERVER-VALIDATED amount (not client-provided)
    const response = await square.payments.create({
      sourceId,
      amountMoney: {
        amount: BigInt(validatedAmountCents), // SECURITY: Use validated amount
        currency
      },
      orderId: squareOrderId,
      customerId: squareCustomerId,
      idempotencyKey: paymentIdempotencyKey,
      note: truncatedNote,
      buyerEmailAddress: customer?.email
    });
    
    if (!response.payment) {
      console.error('Square payment creation failed:', response);
      return NextResponse.json(
        { error: 'Payment processing failed - no payment returned' },
        { status: 500 }
      );
    }
    
    const payment = response.payment;
    
    logger.debug('API', 'Square payment completed:', {
      traceId: ctx.traceId,
      duration: ctx.durationMs(),
      paymentId: payment.id,
      status: payment.status,
      amountMoney: payment.amountMoney,
      receiptUrl: payment.receiptUrl
    });
    
    // CRITICAL: Store payment record in database with fallback persistence
    const paymentRecordId = randomUUID();
    const paymentRecord = {
      id: paymentRecordId,
      squarePaymentId: payment.id,
      idempotencyKey: paymentIdempotencyKey,
      status: payment.status,
      // Convert BigInt to string for JSON serialization
      amountMoney: payment.amountMoney ? {
        amount: String(payment.amountMoney.amount),
        currency: payment.amountMoney.currency
      } : null,
      totalMoney: payment.totalMoney ? {
        amount: String(payment.totalMoney.amount),
        currency: payment.totalMoney.currency
      } : null,
      sourceType: payment.sourceType,
      cardDetails: payment.cardDetails ? {
        brand: payment.cardDetails.card?.cardBrand,
        last4: payment.cardDetails.card?.last4,
        fingerprint: payment.cardDetails.card?.fingerprint,
        expMonth: payment.cardDetails.card?.expMonth,
        expYear: payment.cardDetails.card?.expYear
      } : null,
      receiptNumber: payment.receiptNumber,
      receiptUrl: payment.receiptUrl,
      customer: customer || null,
      orderId,
      lineItems,
      metadata: {
        ...metadata,
        processedAt: new Date().toISOString(),
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'web_payments_sdk'
    };
    
    // Persist with fallback - NEVER silently lose payment data
    const persistResult = await persistWithFallback(
      async () => {
        const { db } = await connectToDatabase();
        await db.collection('payments').insertOne(paymentRecord);
      },
      paymentRecord,
      { type: 'payment', id: payment.id! }
    );
    
    if (!persistResult.success) {
      // CRITICAL: Payment processed but not persisted anywhere
      await criticalAlert('PaymentPersistenceFailure', 'Payment processed but ALL persistence mechanisms failed', {
        squarePaymentId: payment.id,
        orderId,
        amountCents,
        paymentRecord: safeStringify(paymentRecord)
      });
    } else {
      logger.debug('API', 'Payment record saved:', { 
        id: paymentRecordId, 
        primary: persistResult.primary, 
        fallback: persistResult.fallback 
      });
    }
    
    // Update order status if orderId provided
    if (orderId) {
      try {
        const { db } = await connectToDatabase();
        
        // Map Square payment status to order status
        const orderStatus = payment.status === 'COMPLETED' || payment.status === 'APPROVED' ? 'paid' : 'payment_processing';
        
        // Re-fetch order for notifications (order already validated above)
        
        await db.collection('orders').updateOne(
          { id: orderId },
          {
            $set: {
              status: orderStatus,
              paymentStatus: payment.status,
              squarePaymentId: payment.id,
              'payment.status': payment.status === 'COMPLETED' || payment.status === 'APPROVED' ? 'completed' : 'processing',
              'payment.squarePaymentId': payment.id,
              'payment.receiptUrl': payment.receiptUrl,
              'payment.receiptNumber': payment.receiptNumber,
              'payment.cardBrand': payment.cardDetails?.card?.cardBrand,
              'payment.cardLast4': payment.cardDetails?.card?.last4,
              paidAt: payment.status === 'COMPLETED' || payment.status === 'APPROVED' ? new Date() : null,
              updatedAt: new Date()
            },
            $push: {
              timeline: {
                status: orderStatus,
                timestamp: new Date(),
                message: payment.status === 'COMPLETED' ? 'Payment completed successfully' : `Payment ${payment.status.toLowerCase()}`,
                actor: 'square',
                squarePaymentId: payment.id
              }
            }
          }
        );
        logger.debug('API', 'Order status updated:', { orderId, status: orderStatus, paymentStatus: payment.status });
        
        // CRITICAL FIX: Award reward points AFTER payment confirmation (not in order creation)
        if (order && (payment.status === 'COMPLETED' || payment.status === 'APPROVED')) {
          try {
            const total = order.pricing?.total || amountCents / 100;
            const pointsEarned = Math.floor(total);
            await rewardsSystem.addPoints(
              customer?.email || order.customer?.email,
              pointsEarned,
              'purchase',
              {
                orderId: order.id,
                orderTotal: total,
                itemCount: order.items?.length || 0,
                squarePaymentId: payment.id
              }
            );
            logger.debug('API', 'Reward points awarded after payment', { 
              email: customer?.email || order.customer?.email, 
              points: pointsEarned 
            });
          } catch (pointsError) {
            // Non-critical but log for manual reconciliation
            logger.warn('API', 'Failed to award reward points', { 
              orderId,
              error: pointsError instanceof Error ? pointsError.message : String(pointsError)
            });
          }
        }
      } catch (orderError) {
        // Log but don't fail - payment was successful
        logger.error('API', 'Failed to update order status', {
          orderId,
          error: orderError instanceof Error ? orderError.message : String(orderError)
        });
        await criticalAlert('OrderUpdateFailure', 'Payment succeeded but order update failed', {
          orderId,
          squarePaymentId: payment.id,
          error: orderError instanceof Error ? orderError.message : String(orderError)
        });
      }
    }
    
    // Send confirmation notifications with retry and queue fallback
    if (order && (payment.status === 'COMPLETED' || payment.status === 'APPROVED')) {
      // Email notification
      const emailResult = await sendNotificationReliably(
        'email',
        async () => {
          const { sendOrderConfirmationEmail } = await import('@/lib/resend-email');
          await sendOrderConfirmationEmail(order);
        },
        { orderId: order.id, recipient: customer?.email || order.customer?.email }
      );
      
      if (emailResult.success) {
        logger.debug('API', 'Confirmation email sent', { orderId });
      } else if (emailResult.queued) {
        logger.info('API', 'Confirmation email queued for retry', { orderId });
      }
      
      // SMS notification
      const smsResult = await sendNotificationReliably(
        'sms',
        async () => {
          const { sendOrderConfirmationSMS } = await import('@/lib/sms');
          await sendOrderConfirmationSMS(order);
        },
        { orderId: order.id, recipient: customer?.phone || order.customer?.phone }
      );
      
      if (smsResult.success) {
        logger.debug('API', 'Confirmation SMS sent', { orderId });
      } else if (smsResult.queued) {
        logger.info('API', 'Confirmation SMS queued for retry', { orderId });
      }
      
      // Staff notification (best effort, less critical)
      try {
        const { notifyStaffPickupOrder } = await import('@/lib/staff-notifications');
        if (['pickup_market', 'pickup_browns_mill', 'delivery', 'meetup_serenbe'].includes(order.fulfillmentType)) {
          await withRetry(
            () => notifyStaffPickupOrder(order),
            'staff_notification',
            { maxAttempts: 2 }
          );
          logger.debug('API', 'Staff notification sent', { orderId, type: order.fulfillmentType });
        }
      } catch (staffError) {
        logger.warn('API', 'Staff notification failed', { 
          orderId,
          error: staffError instanceof Error ? staffError.message : String(staffError)
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      traceId: ctx.traceId,
      payment: {
        id: payment.id,
        status: payment.status,
        amountPaid: fromCents(payment.amountMoney),
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
    console.error('Payment API error:', error);
    
    // Capture error in Sentry with context
    Sentry.captureException(error, {
      tags: {
        api: 'payments',
        component: 'square_payment'
      },
      contexts: {
        payment: {
          traceId: ctx.traceId,
          duration: ctx.durationMs()
        }
      }
    });
    
    logger.error('API', 'Payment processing failed', {
      traceId: ctx.traceId,
      duration: ctx.durationMs(),
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    });
    
    // Handle specific Square API errors
    if (error instanceof Error) {
      // Check for Square SDK errors with specific status codes
      const anyError = error as any;
      if (anyError.statusCode === 400) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Invalid payment request - please check your payment details',
            details: anyError.errors?.[0]?.detail || error.message,
            traceId: ctx.traceId
          },
          { status: 400 }
        );
      }
      
      if (error.message.includes('CARD_DECLINED')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Payment declined - please try a different payment method',
            traceId: ctx.traceId
          },
          { status: 400 }
        );
      }
      
      if (error.message.includes('INSUFFICIENT_FUNDS')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Insufficient funds - please try a different payment method',
            traceId: ctx.traceId
          },
          { status: 400 }
        );
      }
      
      if (error.message.includes('INVALID_CARD')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Invalid card details - please check your information',
            traceId: ctx.traceId
          },
          { status: 400 }
        );
      }
      
      if (error.message.includes('BAD_REQUEST') || error.message.includes('Invalid')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Invalid request - please check your payment details',
            details: error.message,
            traceId: ctx.traceId
          },
          { status: 400 }
        );
      }
      
      if (error.message.includes('UNAUTHORIZED')) {
        logSquareOperation('Payment Processing', false, { error: 'UNAUTHORIZED' });
        
        if (!shouldAllowFallback()) {
          const failureResponse = getAuthFailureResponse(error);
          return NextResponse.json(
            { ...failureResponse, traceId: ctx.traceId },
            { status: 503 }
          );
        }
        
        // Development fallback mode
        return NextResponse.json(
          { 
            success: false,
            error: 'Payment processing temporarily unavailable',
            fallbackMode: true,
            warning: 'Development mode - no real charges processed',
            traceId: ctx.traceId
          },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Payment processing failed',
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
    
    let paymentRecord;
    
    // Try to get from database first
    try {
      const { db } = await connectToDatabase();
      
      if (paymentId) {
        paymentRecord = await db.collection('payments').findOne({ squarePaymentId: paymentId });
      } else {
        paymentRecord = await db.collection('payments').findOne({ orderId });
      }
    } catch (dbError) {
      console.warn('Failed to query payment from database:', dbError);
    }
    
    // If not found in DB or want fresh data, query Square API
    let squarePayment;
    if (paymentId) {
      try {
        const square = getSquareClient();
        const response = await square.payments.get({ paymentId });
        squarePayment = response.payment;
      } catch (squareError) {
        console.error('Failed to get payment from Square:', squareError);
      }
    }
    
    if (!paymentRecord && !squarePayment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }
    
    // Use Square data if available, otherwise use DB record
    const payment = squarePayment || {
      id: paymentRecord?.squarePaymentId,
      status: paymentRecord?.status,
      amountMoney: paymentRecord?.amountMoney,
      receiptUrl: paymentRecord?.receiptUrl,
      receiptNumber: paymentRecord?.receiptNumber,
      cardDetails: paymentRecord?.cardDetails,
      createdAt: paymentRecord?.createdAt
    };
    
    // FIX: Handle both Square API shape (cardDetails.card.last4) and 
    // DB record shape (cardDetails.last4) for consistency
    const cardInfo = squarePayment 
      ? payment.cardDetails?.card  // Square API: nested under .card
      : payment.cardDetails;        // DB record: flat structure
    
    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        amountPaid: fromCents(payment.amountMoney),
        currency: payment.amountMoney?.currency,
        receiptUrl: payment.receiptUrl,
        receiptNumber: payment.receiptNumber,
        cardLast4: cardInfo?.last4,
        cardBrand: cardInfo?.cardBrand || cardInfo?.brand, // DB uses 'brand', Square uses 'cardBrand'
        createdAt: payment.createdAt
      },
      source: squarePayment ? 'square_api' : 'database'
    });
    
  } catch (error) {
    console.error('Get payment error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
