import { NextResponse } from 'next/server';
import { SquareClient, SquareEnvironment } from 'square';
import { randomUUID } from 'crypto';
import { PerformanceMonitor, InputValidator, ErrorReporter, RateLimiter } from '@/lib/monitoring';

// Rate limiter for payment API (30 requests per minute)
const paymentRateLimiter = new RateLimiter(30, 60000);

// Simple Square client initialization
function getSquareClient() {
  try {
    return new SquareClient({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: process.env.NODE_ENV === 'production' 
        ? SquareEnvironment.Production 
        : SquareEnvironment.Sandbox
    });
  } catch (error) {
    console.error('Failed to initialize Square client:', error);
    throw new Error('Payment system configuration error');
  }
}

// Mock mode for testing when Square credentials are not properly configured
const MOCK_MODE = !process.env.SQUARE_ACCESS_TOKEN || !process.env.SQUARE_ACCESS_TOKEN.startsWith('sandbox-sq0atb');

export async function POST(request) {
  const startTime = Date.now();
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  
  console.log('Square payment API called');
  
  try {
    // Rate limiting check
    if (!paymentRateLimiter.isAllowed(clientIP)) {
      const endTime = Date.now();
      PerformanceMonitor.trackApiPerformance('/api/square-payment', startTime, endTime, 429);
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: 60
        },
        { status: 429 }
      );
    }
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 }
      );
    }

    console.log('Request body received:', { ...body, sourceId: body.sourceId ? '[REDACTED]' : 'missing' });

    const { 
      sourceId, 
      amount, 
      currency = 'USD', 
      orderId, 
      buyerDetails, 
      orderData 
    } = body;
    
    // Enhanced input validation
    if (orderData) {
      const validation = InputValidator.validateOrderData(orderData);
      if (!validation.isValid) {
        const endTime = Date.now();
        PerformanceMonitor.trackApiPerformance('/api/square-payment', startTime, endTime, 400);
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Validation failed',
            details: validation.errors
          },
          { status: 400 }
        );
      }
    }
    
    // Validate required fields
    if (!sourceId || !amount) {
      console.error('Missing required fields:', { sourceId: !!sourceId, amount: !!amount });
      return NextResponse.json(
        { success: false, error: 'Missing required fields: sourceId and amount are required' },
        { status: 400 }
      );
    }
    
    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      console.error('Invalid amount:', amount);
      return NextResponse.json(
        { success: false, error: 'Invalid amount provided' },
        { status: 400 }
      );
    }
    
    // Convert amount to cents
    const amountInCents = Math.round(numAmount * 100);
    console.log('Processing payment:', { amountInCents, currency, orderId });
    
    // Initialize Square client
    const squareClient = getSquareClient();
    
    // Create payment request
    const paymentRequest = {
      sourceId,
      idempotencyKey: body.idempotencyKey || randomUUID(),
      amountMoney: {
        amount: BigInt(amountInCents),
        currency
      },
      locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
      note: `Taste of Gratitude order ${orderId || 'unknown'}`
    };

    console.log('Sending payment request to Square:', { 
      ...paymentRequest, 
      sourceId: '[REDACTED]',
      idempotencyKey: '[REDACTED]'
    });
    
    // Process payment with Square or mock
    let result;
    if (MOCK_MODE) {
      console.log('🔧 MOCK MODE: Simulating successful Square payment');
      // Mock successful payment response
      result = {
        payment: {
          id: `mock_payment_${Date.now()}`,
          status: 'COMPLETED',
          amountMoney: {
            amount: amountInCents,
            currency: currency
          },
          orderId: orderId,
          receiptUrl: `https://mock-square.com/receipt/${Date.now()}`,
          createdAt: new Date().toISOString()
        }
      };
    } else {
      const { result: squareResult } = await squareClient.payments.create(paymentRequest);
      result = squareResult;
    }
    
    console.log('Square payment successful:', {
      paymentId: result.payment.id,
      status: result.payment.status,
      amount: result.payment.amountMoney?.amount
    });
    
    // Track successful payment metrics
    const endTime = Date.now();
    PerformanceMonitor.trackApiPerformance('/api/square-payment', startTime, endTime, 200);
    PerformanceMonitor.trackPaymentMetrics({
      paymentId: result.payment.id,
      amount: amountInCents,
      paymentMethod: 'square'
    }, true, endTime - startTime);
    
    // Return successful response
    const response = {
      success: true,
      paymentId: result.payment.id,
      orderId: result.payment.orderId || orderId,
      receiptUrl: result.payment.receiptUrl,
      status: result.payment.status,
      amount: result.payment.amountMoney?.amount,
      currency: result.payment.amountMoney?.currency,
      processingTime: endTime - startTime
    };
    
    console.log('Payment successful:', response);
    return NextResponse.json(response);
    
  } catch (error) {
    const endTime = Date.now();
    
    // Report error and track metrics
    ErrorReporter.reportError(error, {
      orderId,
      amount,
      sourceId: sourceId ? 'provided' : 'missing',
      endpoint: '/api/square-payment'
    });
    
    PerformanceMonitor.trackApiPerformance('/api/square-payment', startTime, endTime, 500);
    PerformanceMonitor.trackPaymentMetrics({
      paymentId: orderId,
      amount,
      paymentMethod: 'square'
    }, false, endTime - startTime);
    
    console.error('Square payment error:', error);
    
    // Handle timeout errors specifically
    if (error.message === 'Payment processing timeout') {
      return NextResponse.json(
        { success: false, error: 'Payment processing timed out. Please try again.' },
        { status: 408 }
      );
    }
    
    // Handle Square API errors
    if (error.result && error.result.errors && error.result.errors.length > 0) {
      const squareError = error.result.errors[0];
      console.error('Square API error:', squareError);
      
      let errorMessage = squareError.detail || 'Payment processing failed';
      
      // Map specific Square error codes to user-friendly messages
      switch (squareError.code) {
        case 'CARD_DECLINED':
          errorMessage = 'Your card was declined. Please try a different payment method.';
          break;
        case 'INSUFFICIENT_FUNDS':
          errorMessage = 'Insufficient funds. Please try a different payment method.';
          break;
        case 'INVALID_CARD':
          errorMessage = 'Invalid card information. Please check your card details.';
          break;
        case 'EXPIRED_CARD':
          errorMessage = 'Your card has expired. Please use a different payment method.';
          break;
        case 'VERIFY_CVV':
          errorMessage = 'Please verify your card\'s security code and try again.';
          break;
        case 'INVALID_REQUEST_ERROR':
          errorMessage = 'Payment request invalid. Please try again.';
          break;
        default:
          errorMessage = squareError.detail || 'Payment processing failed';
      }
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }
    
    // Generic error handling
    return NextResponse.json(
      { success: false, error: 'Payment processing failed. Please try again.' },
      { status: 500 }
    );
  } catch (outerError) {
    console.error('Outer error in payment processing:', outerError);
    return NextResponse.json(
      { success: false, error: 'Payment system error. Please try again.' },
      { status: 500 }
    );
  }
}

// Add GET method to prevent method not allowed errors
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST for payments.' },
    { status: 405 }
  );
}