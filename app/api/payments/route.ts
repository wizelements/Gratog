
import { logger } from '@/lib/logger';
import { RequestContext } from '@/lib/request-context';
import { NextRequest, NextResponse } from 'next/server';
import { getSquareClient, getSquareLocationId } from '@/lib/square';
import { connectToDatabase } from '@/lib/db-optimized';
import { randomUUID } from 'crypto';
import { fromCents, toSquareMoney } from '@/lib/money';
import { createPayment } from '@/lib/square-ops';
import { shouldAllowFallback, getAuthFailureResponse, logSquareOperation } from '@/lib/square-guard';
import { findOrCreateSquareCustomer, createCustomerNote } from '@/lib/square-customer';

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
    
    if (!amountCents || amountCents <= 0) {
      return NextResponse.json(
        { error: 'Valid amount in cents is required' },
        { status: 400 }
      );
    }
    
    // Generate idempotency key to prevent duplicate payments
    const paymentIdempotencyKey = idempotencyKey || randomUUID();
    
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
      amountCents,
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
    
    if (customer && customer.email && customer.name) {
      logger.debug('API', 'Creating/finding Square customer for payment...');
      try {
        const customerResult = await findOrCreateSquareCustomer({
          email: customer.email,
          name: customer.name,
          phone: customer.phone,
          note: createCustomerNote({
            orderNumber: orderId,
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
    const noteText = `Payment for order ${orderId || 'unknown'}`;
    const truncatedNote = noteText.length > 45 ? noteText.substring(0, 45) : noteText;
    
    logger.debug('API', 'Sending payment request to Square via REST...');
    
    // Use REST API instead of SDK
    const response = await createPayment({
      sourceId,
      amount: amountCents,
      currency,
      locationId,
      idempotencyKey: paymentIdempotencyKey,
      note: truncatedNote,
      orderId: squareOrderId, // Pass Square Order ID to link payment to order
      customerId: squareCustomerId, // ⭐ Link payment to customer
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
    
    // Store payment record in database
    try {
      const { db } = await connectToDatabase();
      const paymentRecord = {
        id: randomUUID(),
        squarePaymentId: payment.id,
        idempotencyKey: paymentIdempotencyKey,
        status: payment.status,
        amountMoney: payment.amountMoney,
        totalMoney: payment.totalMoney,
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
      
      await db.collection('payments').insertOne(paymentRecord);
      logger.debug('API', 'Payment record saved:', paymentRecord.id);
      
      // Update order status if orderId provided
      if (orderId) {
        // Map Square payment status to order status
        const orderStatus = payment.status === 'COMPLETED' || payment.status === 'APPROVED' ? 'paid' : 'payment_processing';
        
        // Fetch the order before updating (needed for notifications)
        const order = await db.collection('orders').findOne({ id: orderId });
        
        await db.collection('orders').updateOne(
          { id: orderId },
          {
            $set: {
              status: orderStatus, // Update main order status
              paymentStatus: payment.status, // Square payment status
              squarePaymentId: payment.id,
              'payment.status': payment.status === 'COMPLETED' || payment.status === 'APPROVED' ? 'completed' : 'processing', // Update nested payment object
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
        
        // Send confirmation emails and notifications only after successful payment
        if (order && (payment.status === 'COMPLETED' || payment.status === 'APPROVED')) {
          try {
            const { sendOrderConfirmationEmail } = await import('@/lib/resend-email');
            await sendOrderConfirmationEmail(order);
            logger.debug('API', 'Confirmation email sent', { orderId });
          } catch (emailError) {
            logger.warn('API', 'Confirmation email failed (non-critical)', { 
              orderId,
              error: emailError instanceof Error ? emailError.message : String(emailError)
            });
          }
          
          try {
            const { sendOrderConfirmationSMS } = await import('@/lib/sms');
            await sendOrderConfirmationSMS(order);
            logger.debug('API', 'Confirmation SMS sent', { orderId });
          } catch (smsError) {
            logger.warn('API', 'Confirmation SMS failed (non-critical)', { 
              orderId,
              error: smsError instanceof Error ? smsError.message : String(smsError)
            });
          }
          
          try {
            const { notifyStaffPickupOrder } = await import('@/lib/staff-notifications');
            if (order.fulfillmentType === 'pickup_market' || order.fulfillmentType === 'pickup_browns_mill' || order.fulfillmentType === 'delivery' || order.fulfillmentType === 'meetup_serenbe') {
              await notifyStaffPickupOrder(order);
              logger.debug('API', 'Staff notification sent', { orderId, type: order.fulfillmentType });
            }
          } catch (staffError) {
            logger.warn('API', 'Staff notification failed (non-critical)', { 
              orderId,
              error: staffError instanceof Error ? staffError.message : String(staffError)
            });
          }
        }
      }
    } catch (dbError) {
      console.warn('Failed to save payment record (non-critical):', dbError);
      // Don't fail the payment if DB save fails
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
    
    logger.error('API', 'Payment processing failed', {
      traceId: ctx.traceId,
      duration: ctx.durationMs(),
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    });
    
    // Handle specific Square API errors
    if (error instanceof Error) {
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
    
    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        amountPaid: fromCents(payment.amountMoney),
        currency: payment.amountMoney?.currency,
        receiptUrl: payment.receiptUrl,
        receiptNumber: payment.receiptNumber,
        cardLast4: payment.cardDetails?.card?.last4,
        cardBrand: payment.cardDetails?.card?.cardBrand,
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
