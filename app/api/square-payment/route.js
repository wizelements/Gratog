import { NextResponse } from 'next/server';
import { SquareClient, SquareEnvironment } from 'square';
import { randomUUID } from 'crypto';
import { createOrder } from '@/lib/db-customers';
import { sendOrderSMS } from '@/lib/sms';
import { sendOrderEmail } from '@/lib/email';

// Live mode enabled - disable mock mode to use real Square integration
const MOCK_MODE = false;

export async function POST(request) {
  const startTime = Date.now();
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
    const squareClient = new SquareClient({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: process.env.NODE_ENV === 'production' 
        ? SquareEnvironment.Production 
        : SquareEnvironment.Sandbox
    });

    // Process payment with Square or mock
    let result;
    if (MOCK_MODE) {
      console.log('🔧 MOCK MODE: Simulating successful Square payment');
      
      const endTime = Date.now();
      
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
      console.log('💳 LIVE MODE: Processing real Square payment');
      
      // Create payment request for Square
      const paymentRequest = {
        sourceId,
        idempotencyKey: randomUUID(),
        amountMoney: {
          amount: amountInCents,
          currency
        },
        locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
        note: `${process.env.NEXT_PUBLIC_SITE_NAME || 'Taste of Gratitude'} order ${orderId || 'unknown'}`
      };
      
      console.log('Sending payment request to Square:', { 
        ...paymentRequest, 
        sourceId: '[REDACTED]'
      });
      
      // Process payment with Square
      const squareResult = await squareClient.payments.create(paymentRequest);
      result = { payment: squareResult.result.payment };
    }

    console.log('Square payment successful:', {
      paymentId: result.payment.id,
      status: result.payment.status,
      amount: result.payment.amountMoney?.amount
    });

    // If payment is successful, create order in database
    if (result.payment && result.payment.status === 'COMPLETED') {
      try {
        // Create order in database
        const orderDetails = {
          id: orderId || result.payment.id,
          customer: orderData?.customer || {
            name: 'Unknown',
            email: '',
            phone: orderData?.customer?.phone || ''
          },
          items: orderData?.cart || [],
          total: amountInCents,
          fulfillmentType: orderData?.fulfillmentType || 'pickup',
          status: 'paid',
          createdAt: new Date().toISOString(),
          paymentId: result.payment.id,
          paymentMethod: 'square',
          // Include delivery details if applicable
          ...(orderData?.deliveryAddress && {
            deliveryAddress: orderData.deliveryAddress,
            deliveryTimeSlot: orderData.deliveryTimeSlot,
            deliveryInstructions: orderData.deliveryInstructions
          })
        };
        
        await createOrder(orderDetails);
        
        // Send confirmation notifications (SMS/Email)
        if (orderDetails.customer.phone) {
          try {
            await sendOrderSMS(orderDetails);
          } catch (smsError) {
            console.error('Failed to send SMS confirmation:', smsError);
            // Don't fail the payment if SMS fails
          }
        }
        
        if (orderDetails.customer.email) {
          try {
            await sendOrderEmail(orderDetails);
          } catch (emailError) {
            console.error('Failed to send email confirmation:', emailError);
            // Don't fail the payment if email fails
          }
        }
      } catch (dbError) {
        console.error('Failed to save order to database:', dbError);
        // Don't fail the payment if database save fails
      }
    }

    const endTime = Date.now();
    
    // Return successful response
    return NextResponse.json({
      success: true,
      paymentId: result.payment.id,
      orderId: result.payment.orderId || orderId,
      receiptUrl: result.payment.receiptUrl,
      status: result.payment.status,
      amount: result.payment.amountMoney?.amount,
      currency: result.payment.amountMoney?.currency,
      processingTime: endTime - startTime
    });
    
  } catch (error) {
    console.error('Square payment error:', error);
    
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