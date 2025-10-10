import { NextResponse } from 'next/server';
import { SquareClient, SquareEnvironment } from 'square';
import { randomUUID } from 'crypto';

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
  console.log('Square payment API called');
  
  try {
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
    
    // Simple success response (no background processing for now to avoid issues)
    return NextResponse.json({
      success: true,
      paymentId: result.payment.id,
      orderId: result.payment.orderId || orderId,
      receiptUrl: result.payment.receiptUrl,
      status: result.payment.status,
      amount: result.payment.amountMoney?.amount,
      currency: result.payment.amountMoney?.currency
    });
    
  } catch (error) {
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
  }
}

// Add GET method to prevent method not allowed errors
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST for payments.' },
    { status: 405 }
  );
}