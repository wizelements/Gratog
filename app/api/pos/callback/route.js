
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';

/**
 * Square Point of Sale API Web Callback Handler
 * 
 * This endpoint receives payment notifications from Square Point of Sale
 * when transactions are completed via the POS app on iOS/Android
 * 
 * Documentation: https://developer.squareup.com/docs/pos-api/what-it-does
 */

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Square POS sends these parameters on successful transaction
    const data = {
      // Transaction details
      transactionId: searchParams.get('transaction_id'),
      clientTransactionId: searchParams.get('client_transaction_id'),
      
      // Payment amount
      amount: searchParams.get('amount'), // In cents
      currencyCode: searchParams.get('currency_code') || 'USD',
      
      // Status
      status: searchParams.get('status'), // 'ok', 'error', or 'cancel'
      errorCode: searchParams.get('error_code'),
      
      // Additional data
      referenceId: searchParams.get('com.squareup.pos.REFERENCE_ID'),
      notes: searchParams.get('com.squareup.pos.NOTES'),
      
      // Custom data we may have passed
      orderId: searchParams.get('orderId'),
      customerEmail: searchParams.get('customerEmail'),
      
      // Receipt
      receiptUrl: searchParams.get('com.squareup.pos.RECEIPT_URL'),
      
      // Metadata
      receivedAt: new Date().toISOString()
    };
    
    debug('📱 Square POS Callback received:', data);
    
    // Handle different statuses
    if (data.status === 'error') {
      console.error('❌ Square POS transaction error:', data.errorCode);
      
      // Redirect to error page
      return NextResponse.redirect(
        new URL(`/checkout/error?reason=${data.errorCode || 'pos_error'}`, request.url)
      );
    }
    
    if (data.status === 'cancel') {
      debug('⚠️ Square POS transaction cancelled by user');
      
      // Redirect to order page to try again
      return NextResponse.redirect(
        new URL('/order?status=cancelled', request.url)
      );
    }
    
    if (data.status === 'ok' && data.transactionId) {
      debug('✅ Square POS transaction successful:', data.transactionId);
      
      // Update order in database and track for spin eligibility
      if (data.orderId && data.customerEmail) {
        try {
          const { db } = await connectToDatabase();
          
          const orderTotal = data.amount ? parseInt(data.amount) / 100 : 0;
          
          // Update order status
          await db.collection('orders').updateOne(
            { id: data.orderId },
            {
              $set: {
                status: 'paid',
                paymentMethod: 'square_pos',
                squareTransactionId: data.transactionId,
                squareReceiptUrl: data.receiptUrl,
                paidAt: new Date(),
                updatedAt: new Date()
              }
            }
          );
          
          // Track order and award spins
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/tracking/user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'track_order',
              userEmail: data.customerEmail,
              data: {
                orderId: data.orderId,
                total: orderTotal,
                status: 'completed',
                paymentMethod: 'square_pos',
                transactionId: data.transactionId
              }
            })
          });
          
          debug('✅ Order tracked with spin rewards');
        } catch (dbError) {
          console.error('Failed to update order:', dbError);
          // Continue anyway - payment was successful
        }
      }
      
      // Award reward points for purchase
      if (data.customerEmail && data.amount) {
        try {
          const points = Math.floor(parseInt(data.amount) / 100); // $1 = 1 point
          
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/rewards/add-points`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: data.customerEmail,
              points: points,
              activityType: 'purchase',
              activityData: {
                orderId: data.orderId,
                transactionId: data.transactionId,
                amount: data.amount,
                paymentMethod: 'square_pos'
              }
            })
          });
          
          debug(`✅ Awarded ${points} reward points`);
        } catch (pointsError) {
          console.error('Failed to award points:', pointsError);
        }
      }
      
      // Redirect to success page with transaction details
      const successUrl = new URL('/checkout/success', request.url);
      successUrl.searchParams.set('transactionId', data.transactionId);
      successUrl.searchParams.set('amount', data.amount);
      successUrl.searchParams.set('orderId', data.orderId || '');
      successUrl.searchParams.set('method', 'pos');
      
      return NextResponse.redirect(successUrl);
    }
    
    // Unknown status - redirect to home
    console.warn('⚠️ Unknown Square POS callback status:', data.status);
    return NextResponse.redirect(new URL('/', request.url));
    
  } catch (error) {
    console.error('💥 Square POS callback error:', { error: error.message, stack: error.stack });
    
    // Redirect to error page
    return NextResponse.redirect(
      new URL('/checkout/error?reason=callback_error', request.url)
    );
  }
}

// POST method support (in case Square sends POST instead of GET)
export async function POST(request) {
  try {
    const body = await request.json();
    
    debug('📱 Square POS Callback (POST):', body);
    
    // Convert POST data to GET-like handling
    const searchParams = new URLSearchParams();
    Object.entries(body).forEach(([key, value]) => {
      searchParams.set(key, String(value));
    });
    
    // Build URL with search params and call GET handler
    const url = new URL(request.url);
    url.search = searchParams.toString();
    
    const getRequest = new Request(url.toString(), {
      method: 'GET',
      headers: request.headers
    });
    
    return await GET(getRequest);
    
  } catch (error) {
    console.error('💥 Square POS POST callback error:', { error: error.message, stack: error.stack });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process POS callback',
        received: true 
      },
      { status: 500 }
    );
  }
}
