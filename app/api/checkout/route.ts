import { NextRequest, NextResponse } from 'next/server';
import { getSquareClient, SQUARE_LOCATION_ID } from '@/lib/square';
import { connectToDatabase } from '@/lib/db-optimized';
import { randomUUID } from 'crypto';
import { createOrder, createPaymentLink } from '@/lib/square-ops';

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
    
    console.log('Creating Square Payment Link:', {
      itemCount: lineItems.length,
      locationId: SQUARE_LOCATION_ID,
      customerEmail: customer?.email,
      orderId
    });
    
    // Get fresh Square client instance
    const square = getSquareClient();
    
    // Prepare order for Square
    const orderRequest: any = {
      locationId: SQUARE_LOCATION_ID,
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
    
    // Add customer ID if provided
    if (customerId) {
      orderRequest.customerId = customerId;
    }
    
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
    
    console.log('Creating order and payment link via REST...');
    
    // Step 1: Create order via REST API
    const orderBody = {
      line_items: lineItems.map((item: any) => ({
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
      })),
      pricing_options: {
        auto_apply_taxes: true,
        auto_apply_discounts: true
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
    
    // Add customer ID if provided
    if (customerId) {
      orderBody.customer_id = customerId;
    }
    
    const orderResponse = await createOrder(SQUARE_LOCATION_ID, orderBody);
    
    if (!orderResponse.order) {
      console.error('Square order creation failed:', orderResponse);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }
    
    // Step 2: Create payment link for the order
    const paymentLinkResponse = await createPaymentLink({
      orderId: orderResponse.order.id,
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
    
    console.log('Square Payment Link created successfully:', {
      paymentLinkId: paymentLink.id,
      orderId: paymentLink.order_id,
      url: paymentLink.url?.substring(0, 50) + '...'
    });
    
    // Store pre-order record in database for tracking
    try {
      const { db } = await connectToDatabase();
      const preOrder = {
        id: orderId || randomUUID(),
        squareOrderId: paymentLink.order_id,
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
      console.log('Pre-order record saved:', preOrder.id);
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
        return NextResponse.json(
          { error: 'Square API authentication failed' },
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
    
    if (!paymentLinkId && !orderId) {
      return NextResponse.json(
        { error: 'Payment Link ID or Order ID is required' },
        { status: 400 }
      );
    }
    
    const square = getSquareClient();
    let result;
    
    if (paymentLinkId) {
      // Get payment link status
      const response = await square.checkout.paymentLinks.get(paymentLinkId) as any;
      result = response.result;
    } else if (orderId) {
      // Get order status
      const response = await square.orders.get(orderId) as any;
      result = response.result;
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
