import { NextRequest, NextResponse } from 'next/server';
import { getSquareClient, SQUARE_LOCATION_ID } from '@/lib/square';
import { connectToDatabase } from '@/lib/db-optimized';
import { randomUUID } from 'crypto';
import { fromCents, toSquareMoney } from '@/lib/money';
import { createPayment } from '@/lib/square-ops';
import { shouldAllowFallback, getAuthFailureResponse, logSquareOperation } from '@/lib/square-guard';

/**
 * Square Payments API - Web Payments SDK Integration
 * Processes tokenized payment methods from the Web Payments SDK for in-page checkout
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      sourceId, // Payment token from Web Payments SDK
      amountCents,
      currency = 'USD',
      orderId,
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
    
    console.log('Processing Square Web Payment:', {
      sourceId: sourceId.substring(0, 20) + '...',
      amountCents,
      currency,
      locationId: SQUARE_LOCATION_ID,
      idempotencyKey: paymentIdempotencyKey,
      orderId
    });
    
    // Get fresh Square client instance
    const square = getSquareClient();
    
    // Truncate note to Square's 45 character limit (must be defined before use)
    const noteText = `Payment for order ${orderId || 'unknown'}`;
    const truncatedNote = noteText.length > 45 ? noteText.substring(0, 45) : noteText;
    
    // Prepare payment request
    const paymentRequest: any = {
      sourceId,
      idempotencyKey: paymentIdempotencyKey,
      amountMoney: {
        amount: BigInt(amountCents),
        currency
      },
      locationId: SQUARE_LOCATION_ID,
      autocomplete: true, // Immediately complete the payment
      acceptPartialAuthorization: false,
      note: truncatedNote,
      ...(customer?.email && { buyerEmailAddress: customer.email })
    };
    
    // Add order ID if provided
    if (orderId) {
      paymentRequest.orderId = orderId;
    }
    
    console.log('Sending payment request to Square via REST...');
    
    // Use REST API instead of SDK
    const response = await createPayment({
      sourceId,
      amount: amountCents,
      currency,
      locationId: SQUARE_LOCATION_ID,
      idempotencyKey: paymentIdempotencyKey,
      note: truncatedNote
    });
    
    if (!response.payment) {
      console.error('Square payment creation failed:', response);
      return NextResponse.json(
        { error: 'Payment processing failed - no payment returned' },
        { status: 500 }
      );
    }
    
    const payment = response.payment;
    
    console.log('Square payment completed:', {
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
      console.log('Payment record saved:', paymentRecord.id);
      
      // Update order status if orderId provided
      if (orderId) {
        await db.collection('orders').updateOne(
          { id: orderId },
          {
            $set: {
              paymentStatus: payment.status,
              squarePaymentId: payment.id,
              paidAt: payment.status === 'COMPLETED' ? new Date() : null,
              updatedAt: new Date()
            }
          }
        );
        console.log('Order payment status updated:', orderId);
      }
    } catch (dbError) {
      console.warn('Failed to save payment record (non-critical):', dbError);
      // Don't fail the payment if DB save fails
    }
    
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
        cardBrand: payment.cardDetails?.card?.cardBrand
      },
      orderId,
      message: 'Payment processed successfully'
    });
    
  } catch (error) {
    console.error('Payment API error:', error);
    
    // Handle specific Square API errors
    if (error instanceof Error) {
      if (error.message.includes('CARD_DECLINED')) {
        return NextResponse.json(
          { error: 'Payment declined - please try a different payment method' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('INSUFFICIENT_FUNDS')) {
        return NextResponse.json(
          { error: 'Insufficient funds - please try a different payment method' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('INVALID_CARD')) {
        return NextResponse.json(
          { error: 'Invalid card details - please check your information' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('UNAUTHORIZED')) {
        logSquareOperation('Payment Processing', false, { error: 'UNAUTHORIZED' });
        
        if (!shouldAllowFallback()) {
          const failureResponse = getAuthFailureResponse(error);
          return NextResponse.json(failureResponse, { status: 503 });
        }
        
        // Development fallback mode
        return NextResponse.json(
          { 
            error: 'Payment processing temporarily unavailable',
            fallbackMode: true,
            warning: 'Development mode - no real charges processed'
          },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Payment processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
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
        const response = await square.payments.get(paymentId) as any;
        squarePayment = response.result?.payment;
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
