import { NextRequest, NextResponse } from 'next/server';
import { square, SQUARE_LOCATION_ID } from '@/lib/square';
import { connectToDatabase } from '@/lib/db-optimized';
import { randomUUID } from 'crypto';

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
    
    // Create the payment link
    const paymentLinkRequest: any = {
      order: orderRequest,
      checkoutOptions
    };
    
    if (Object.keys(prePopulatedData).length > 0) {
      paymentLinkRequest.prePopulatedData = prePopulatedData;
    }
    
    console.log('Sending payment link request to Square...');
    
    const { result } = await (square.checkout as any).createPaymentLink(paymentLinkRequest);
    
    if (!result.paymentLink) {
      console.error('Square Payment Link creation failed:', result);
      return NextResponse.json(
        { error: 'Failed to create payment link - no payment link returned' },
        { status: 500 }
      );
    }
    
    const paymentLink = result.paymentLink;
    
    console.log('Square Payment Link created successfully:', {
      paymentLinkId: paymentLink.id,
      orderId: paymentLink.orderId,
      url: paymentLink.url?.substring(0, 50) + '...'
    });
    
    // Store pre-order record in database for tracking
    try {
      const { db } = await connectToDatabase();
      const preOrder = {
        id: orderId || randomUUID(),
        squareOrderId: paymentLink.orderId,
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
        orderId: paymentLink.orderId
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
    
    let result;
    
    if (paymentLinkId) {
      // Get payment link status
      const response = await (square.checkout as any).retrievePaymentLink({
        id: paymentLinkId
      });
      result = response.result;
    } else if (orderId) {
      // Get order status
      const response = await (square.orders as any).retrieveOrder({
        orderId: orderId
      });
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