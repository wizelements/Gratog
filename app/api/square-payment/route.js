import { NextResponse } from 'next/server';
import { Client, Environment } from 'square';
import { randomUUID } from 'crypto';
import { createOrder } from '@/lib/db-customers';
import { sendOrderSMS } from '@/lib/sms';
import { sendOrderEmail } from '@/lib/email';

// Initialize Square client
const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.NODE_ENV === 'production' 
    ? Environment.Production 
    : Environment.Sandbox
});

export async function POST(request) {
  try {
    const body = await request.json();
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
      return NextResponse.json(
        { success: false, error: 'Missing required fields: sourceId and amount are required' },
        { status: 400 }
      );
    }
    
    // Convert amount to cents (Square expects amount in smallest currency unit)
    const amountInCents = Math.round(parseFloat(amount) * 100);
    
    // Create payment request
    const paymentRequest = {
      sourceId,
      idempotencyKey: body.idempotencyKey || randomUUID(),
      amountMoney: {
        amount: amountInCents,
        currency
      },
      // Optional: Link to order if you have one
      orderId: orderId,
      // Optional: Include customer details
      buyerEmailAddress: buyerDetails?.email,
      // Optional: Include location ID if not using default
      locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
      // Optional: Include note for the payment
      note: `Payment for ${process.env.NEXT_PUBLIC_SITE_NAME || 'Taste of Gratitude'} order ${orderId || 'unknown'}`
    };
    
    // Process payment with Square
    const { result } = await squareClient.paymentsApi.createPayment(paymentRequest);
    
    // If payment is successful, create order in database
    if (result.payment && result.payment.status === 'COMPLETED') {
      try {
        // Create order in database
        const orderDetails = {
          id: orderId || result.payment.id,
          customer: orderData?.customer || {
            name: buyerDetails?.givenName || 'Unknown',
            email: buyerDetails?.email || '',
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
    
    // Return successful response
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
    
    // Extract error details from Square response
    let errorMessage = 'Payment processing failed';
    let statusCode = 500;
    
    if (error.result && error.result.errors && error.result.errors.length > 0) {
      errorMessage = error.result.errors[0].detail || errorMessage;
      
      // Map specific Square error codes to more user-friendly messages
      const errorCode = error.result.errors[0].code;
      switch (errorCode) {
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
        default:
          // Keep the original error message for other cases
          break;
      }
      
      statusCode = error.statusCode || 500;
    }
    
    // Return error response
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}