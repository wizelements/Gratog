import { NextResponse } from 'next/server';
import { SquareClient, SquareEnvironment } from 'square';
import { randomUUID } from 'crypto';
import { createOrderOptimized } from '@/lib/db-optimized';
import { sendOrderSMS } from '@/lib/sms';
import { sendOrderEmail } from '@/lib/email';
import { ResponseOptimizer, MemoryOptimizer } from '@/lib/response-optimizer';

// Check if we have valid Square credentials - if not, use mock mode
const hasValidSquareToken = process.env.SQUARE_ACCESS_TOKEN && 
  (process.env.SQUARE_ACCESS_TOKEN.startsWith('sandbox-sq0atb') || 
   process.env.SQUARE_ACCESS_TOKEN.startsWith('sq0atp-') ||
   process.env.SQUARE_ACCESS_TOKEN.startsWith('EAAAl')); // Accept our current token format

const MOCK_MODE = !hasValidSquareToken;

console.log('Square Integration Mode:', MOCK_MODE ? 'MOCK' : 'LIVE', 
           `Token format: ${process.env.SQUARE_ACCESS_TOKEN?.substring(0, 10)}...`);

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
      return ResponseOptimizer.error('Invalid request format', 400, { success: false });
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
      return ResponseOptimizer.error('Missing required fields: sourceId and amount are required', 400, { success: false });
    }
    
    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      console.error('Invalid amount:', amount);
      return ResponseOptimizer.error('Invalid amount provided', 400, { success: false });
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
          amount: BigInt(amountInCents),
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
          // Include coupon details if applied
          ...(orderData?.appliedCoupon && {
            appliedCoupon: {
              code: orderData.appliedCoupon.code,
              discountAmount: orderData.appliedCoupon.discountAmount,
              freeShipping: orderData.appliedCoupon.freeShipping
            },
            subtotal: orderData.subtotal,
            couponDiscount: orderData.couponDiscount,
            originalTotal: orderData.subtotal + (orderData.originalDeliveryFee || 0)
          }),
          // Include delivery details if applicable
          ...(orderData?.deliveryAddress && {
            deliveryAddress: orderData.deliveryAddress,
            deliveryTimeSlot: orderData.deliveryTimeSlot,
            deliveryInstructions: orderData.deliveryInstructions
          })
        };
        
        await createOrderOptimized(orderDetails);
        
        // Mark coupon as used if one was applied
        if (orderData?.appliedCoupon?.code) {
          try {
            const couponResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/coupons/validate`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                couponCode: orderData.appliedCoupon.code,
                orderId: orderDetails.id
              })
            });
            
            if (couponResponse.ok) {
              console.log('Coupon marked as used:', orderData.appliedCoupon.code);
            } else {
              console.warn('Failed to mark coupon as used:', orderData.appliedCoupon.code);
            }
          } catch (couponError) {
            console.error('Error marking coupon as used:', couponError);
          }
        }
        
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
    
    // Return optimized successful response
    return ResponseOptimizer.json({
      success: true,
      paymentId: result.payment.id,
      orderId: result.payment.orderId || orderId,
      receiptUrl: result.payment.receiptUrl,
      status: result.payment.status,
      amount: result.payment.amountMoney?.amount,
      currency: result.payment.amountMoney?.currency,
      processingTime: endTime - startTime
    }, {
      cacheMaxAge: 0, // Don't cache payment responses
      compress: true
    });
    
  } catch (error) {
    console.error('Square payment error:', error);
    
    return ResponseOptimizer.error('Payment processing failed. Please try again.', 500, { success: false });
  }
}

// Add GET method to prevent method not allowed errors
export async function GET() {
  return ResponseOptimizer.error('Method not allowed. Use POST for payments.', 405);
}