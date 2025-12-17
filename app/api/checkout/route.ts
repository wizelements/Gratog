

import { NextRequest, NextResponse } from 'next/server';
import { getSquareClient, SQUARE_LOCATION_ID } from '@/lib/square';
import { connectToDatabase } from '@/lib/db-optimized';
import { randomUUID } from 'crypto';
import { createOrder, createPaymentLink } from '@/lib/square-ops';
import { shouldAllowFallback, getAuthFailureResponse, logSquareOperation } from '@/lib/square-guard';
import { findOrCreateSquareCustomer, createCustomerNote } from '@/lib/square-customer';
import { logger } from '@/lib/logger';

/**
 * Square Checkout API - Payment Links Integration
 * Creates Square-hosted checkout pages for seamless payment processing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      lineItems, 
      redirectUrl,
      customer,
      orderId,
      customerId,
      fulfillmentType,
      deliveryAddress 
    } = body;
    
    // Validate required fields
    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json(
        { error: 'Line items array is required' },
        { status: 400 }
      );
    }
    
    // Validate line items structure
    for (const item of lineItems) {
      if (!item.catalogObjectId || !item.quantity) {
        return NextResponse.json(
          { error: 'Each line item must have catalogObjectId and quantity' },
          { status: 400 }
        );
      }
    }
    
    logger.debug('Checkout', 'Creating Square Payment Link:', {
      itemCount: lineItems.length,
      locationId: SQUARE_LOCATION_ID,
      customerEmail: customer?.email,
      orderId
    });
    
    // Get fresh Square client instance
    const square = getSquareClient();
    
    // STEP 1: Create or find Square Customer (if customer info provided)
    let squareCustomerId = customerId; // Use provided ID if available
    
    if (customer && customer.email && customer.name && !squareCustomerId) {
      logger.debug('Checkout', 'Creating/finding Square customer for payment link...');
      try {
        const customerResult = await findOrCreateSquareCustomer({
          email: customer.email,
          name: customer.name,
          phone: customer.phone,
          address: fulfillmentType === 'delivery' && deliveryAddress ? {
            street: deliveryAddress.street,
            city: deliveryAddress.city,
            state: deliveryAddress.state || 'GA',
            zip: deliveryAddress.zip
          } : undefined,
          note: createCustomerNote({
            orderNumber: orderId,
            fulfillmentType,
            source: 'payment_link'
          })
        });
        
        if (customerResult.success && customerResult.customer) {
          squareCustomerId = customerResult.customer.id;
          logger.debug('Checkout', '✅ Square customer ready for payment link', { customerId: squareCustomerId });
        } else {
          console.warn('Customer creation failed, continuing without customer link', { 
            error: customerResult.error 
          });
        }
      } catch (custError) {
        console.warn('Customer lookup error, continuing', { error: custError });
      }
    }
    
    // Prepare order for Square
    const orderRequest: any = {
      locationId: SQUARE_LOCATION_ID,
      referenceId: orderId, // ⭐ Order reference for matching
      lineItems: lineItems.map((item: any) => ({
        catalogObjectId: item.catalogObjectId,
        quantity: String(item.quantity),
        basePriceMoney: item.basePriceMoney,
        name: item.name,
        variationName: item.variationName,
        metadata: {
          originalProductId: item.productId,
          category: item.category,
          size: item.size
        }
      })),
      customerId: squareCustomerId || undefined, // ⭐ Link customer to order
      pricingOptions: {
        autoApplyTaxes: true,
        autoApplyDiscounts: true
      },
      metadata: {
        orderId: orderId || randomUUID(),
        source: 'website',
        fulfillmentType: fulfillmentType || 'pickup',
        customerEmail: customer?.email || '',
        customerName: customer?.name || '',
        customerPhone: customer?.phone || '',
        createdAt: new Date().toISOString()
      }
    };
    
    // Prepare checkout options
    const checkoutOptions: any = {
      redirectUrl: redirectUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success`,
      askForShippingAddress: fulfillmentType === 'delivery'
    };
    
    // Pre-populate customer data if provided
    const prePopulatedData: any = {};
    if (customer?.email) {
      prePopulatedData.buyerEmail = customer.email;
    }
    if (customer?.phone) {
      prePopulatedData.buyerPhoneNumber = customer.phone;
    }
    
    logger.debug('Checkout', 'Creating payment link directly with line items (quick_pay approach)...');
    
    // Prepare line items for payment link (without pre-creating order)
    const paymentLinkLineItems = lineItems.map((item: any) => ({
      catalog_object_id: item.catalogObjectId,
      quantity: String(item.quantity),
      base_price_money: item.basePriceMoney,
      name: item.name,
      variation_name: item.variationName,
      metadata: {
        originalProductId: item.productId,
        category: item.category,
        size: item.size
      }
    }));
    
    // Create payment link directly with line items
    const paymentLinkResponse = await createPaymentLink({
      locationId: SQUARE_LOCATION_ID,
      lineItems: paymentLinkLineItems,
      idempotencyKey: randomUUID(),
      checkoutOptions: {
        redirectUrl: redirectUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success`,
        askForShippingAddress: fulfillmentType === 'delivery'
      }
    });
    
    if (!paymentLinkResponse.payment_link) {
      console.error('Square Payment Link creation failed:', paymentLinkResponse);
      return NextResponse.json(
        { error: 'Failed to create payment link - no payment link returned' },
        { status: 500 }
      );
    }
    
    const paymentLink = paymentLinkResponse.payment_link;
    
    logger.debug('Checkout', 'Square Payment Link created successfully:', {
      paymentLinkId: paymentLink.id,
      orderId: paymentLink.order_id,
      url: paymentLink.url?.substring(0, 50) + '...'
    });
    
    // Store pre-order record in database for tracking
    try {
      const { db } = await connectToDatabase();
      const preOrder = {
        id: orderId || randomUUID(),
        squareOrderId: paymentLink.order_id,  // Order ID from payment link
        paymentLinkId: paymentLink.id,
        paymentLinkUrl: paymentLink.url,
        customer: customer || {},
        lineItems,
        fulfillmentType,
        deliveryAddress,
        status: 'pending_payment',
        createdAt: new Date(),
        updatedAt: new Date(),
        source: 'square_payment_link'
      };
      
      await db.collection('pre_orders').insertOne(preOrder);
      logger.debug('Checkout', 'Pre-order record saved:', preOrder.id);
    } catch (dbError) {
      console.warn('Failed to save pre-order record (non-critical):', dbError);
      // Don't fail the entire request if DB save fails
    }
    
    return NextResponse.json({
      success: true,
      paymentLink: {
        id: paymentLink.id,
        url: paymentLink.url,
        orderId: paymentLink.order_id
      },
      message: 'Payment link created successfully'
    });
    
  } catch (error) {
    console.error('Checkout API error:', error);
    
    // Log full error details for debugging
    if (error && typeof error === 'object') {
      console.error('Error details:', JSON.stringify(error, null, 2));
    }
    
    // Handle specific Square API errors
    if (error instanceof Error) {
      if (error.message.includes('CATALOG_OBJECT_NOT_FOUND')) {
        return NextResponse.json(
          { error: 'One or more products not found in Square catalog' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('INVALID_LOCATION')) {
        return NextResponse.json(
          { error: 'Invalid location configuration' },
          { status: 500 }
        );
      }
      
      if (error.message.includes('UNAUTHORIZED')) {
        logSquareOperation('Checkout/Payment Link', false, { error: 'UNAUTHORIZED' });
        
        if (!shouldAllowFallback()) {
          const failureResponse = getAuthFailureResponse(error);
          return NextResponse.json(failureResponse, { status: 503 });
        }
        
        // Development fallback mode
        return NextResponse.json(
          { 
            error: 'Square API authentication failed',
            fallbackMode: true,
            warning: 'Development mode - no real checkout links generated'
          },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create checkout',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for checkout status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentLinkId = searchParams.get('paymentLinkId');
    const orderId = searchParams.get('orderId');
    
    // If no parameters, return service status
    if (!paymentLinkId && !orderId) {
      return NextResponse.json({
        service: 'Square Checkout API',
        status: 'active',
        environment: process.env.SQUARE_ENVIRONMENT || 'sandbox',
        locationId: SQUARE_LOCATION_ID,
        timestamp: new Date().toISOString()
      });
    }
    
    const square = getSquareClient();
    let result;
    
    if (paymentLinkId) {
      // Get payment link status
      const response = await square.checkout.get({ paymentLinkId });
      result = response;
    } else if (orderId) {
      // Get order status
      const response = await square.orders.get({ orderId });
      result = response;
    }
    
    return NextResponse.json({
      success: true,
      data: result,
      message: 'Status retrieved successfully'
    });
    
  } catch (error) {
    console.error('Get checkout status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
