

import { NextRequest, NextResponse } from 'next/server';
import { getSquareClient, getSquareLocationId } from '@/lib/square';
import { connectToDatabase } from '@/lib/db-optimized';
import { randomUUID } from 'crypto';
import { shouldAllowFallback, getAuthFailureResponse, logSquareOperation } from '@/lib/square-guard';
import { findOrCreateSquareCustomer, createCustomerNote } from '@/lib/square-customer';
import { logger } from '@/lib/logger';
import { sanitizeErrorMessage, createSafeErrorResponse } from '@/lib/response-sanitizer';
import { RequestContext } from '@/lib/request-context';
import { RateLimit } from '@/lib/redis';
import * as Sentry from '@sentry/nextjs';
import { appendOrderAccessToken, generateOrderAccessToken } from '@/lib/order-access-token';

// Helper to validate Square catalog IDs (20+ char alphanumeric)
const isValidSquareCatalogId = (id?: string): boolean => {
  return !!id && typeof id === 'string' && id.length >= 20 && /^[A-Z0-9]+$/i.test(id);
};

/**
 * Square Checkout API - Payment Links Integration
 * Creates Square-hosted checkout pages for seamless payment processing
 */
export async function POST(request: NextRequest) {
   const ctx = new RequestContext();
   const json = (payload: Record<string, unknown>, status = 200) =>
     NextResponse.json({ ...payload, traceId: ctx.traceId }, { status });

   try {
     const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
     if (!RateLimit.check(`checkout_create:${clientIp}`, 30, 60 * 60)) {
       return json({ error: 'Too many checkout attempts. Please try again later.' }, 429);
     }

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

    const effectiveOrderId = orderId || randomUUID();
    const rawRedirectUrl = redirectUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?orderId=${encodeURIComponent(effectiveOrderId)}`;
    const orderAccessToken = generateOrderAccessToken({
      orderId: effectiveOrderId,
      customerEmail: customer?.email || null,
      ttlMs: 7 * 24 * 60 * 60 * 1000,
    });
    const secureRedirectUrl = appendOrderAccessToken(rawRedirectUrl, orderAccessToken);
    
    // Validate required fields
    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return json({ error: 'Line items array is required' }, 400);
    }
    
    // Validate line items structure - quantity is required, catalogObjectId is optional
    for (const item of lineItems) {
      if (!item.quantity) {
        return json({ error: 'Each line item must have quantity' }, 400);
      }
      // Name is required for ad-hoc items without valid catalog IDs
      if (!isValidSquareCatalogId(item.catalogObjectId) && !item.name) {
        return json({ error: 'Each line item must have either a valid catalogObjectId or a name' }, 400);
      }
    }
    
    const locationId = getSquareLocationId();
    logger.debug('Checkout', 'Creating Square Payment Link:', {
      itemCount: lineItems.length,
      locationId,
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
      locationId,
      referenceId: orderId, // ⭐ Order reference for matching
      lineItems: lineItems.map((item: any) => {
        const lineItem: any = {
          quantity: String(item.quantity),
          basePriceMoney: item.basePriceMoney,
          name: item.name,
          variationName: item.variationName,
          metadata: {
            originalProductId: item.productId,
            category: item.category,
            size: item.size
          }
        };
        // CRITICAL FIX: Only include catalogObjectId if it's a valid Square ID
        if (isValidSquareCatalogId(item.catalogObjectId)) {
          lineItem.catalogObjectId = item.catalogObjectId;
        }
        return lineItem;
      }),
      customerId: squareCustomerId || undefined, // ⭐ Link customer to order
      pricingOptions: {
        autoApplyTaxes: true,
        autoApplyDiscounts: true
      },
      metadata: {
        orderId: effectiveOrderId,
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
      redirectUrl: secureRedirectUrl,
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
    
    logger.debug('Checkout', 'Creating payment link with SDK...');
    
    // Prepare line items for payment link
    const paymentLinkLineItems = lineItems.map((item: any) => {
      const lineItem: any = {
        quantity: String(item.quantity),
        basePriceMoney: item.basePriceMoney,
        name: item.name,
        variationName: item.variationName,
        metadata: {
          originalProductId: item.productId,
          category: item.category,
          size: item.size
        }
      };
      // CRITICAL FIX: Only include catalogObjectId if it's a valid Square ID
      if (isValidSquareCatalogId(item.catalogObjectId)) {
        lineItem.catalogObjectId = item.catalogObjectId;
      }
      return lineItem;
    });
    
    // Create payment link directly with SDK using Order (since lineItems isn't directly supported)
    const paymentLinkResponse = await square.checkout.paymentLinks.create({
      order: {
        locationId,
        referenceId: orderId,
        lineItems: paymentLinkLineItems,
        customerId: squareCustomerId || undefined,
        pricingOptions: {
          autoApplyTaxes: true,
          autoApplyDiscounts: true
        },
        metadata: {
          orderId: effectiveOrderId,
          source: 'website',
          fulfillmentType: fulfillmentType || 'pickup',
          customerEmail: customer?.email || '',
          customerName: customer?.name || '',
          customerPhone: customer?.phone || '',
          createdAt: new Date().toISOString()
        }
      },
      idempotencyKey: randomUUID(),
      checkoutOptions: {
        redirectUrl: secureRedirectUrl,
        askForShippingAddress: fulfillmentType === 'delivery'
      }
    });
    
    if (!paymentLinkResponse.paymentLink) {
      console.error('Square Payment Link creation failed:', paymentLinkResponse);
      return json({ error: 'Failed to create payment link - no payment link returned' }, 500);
    }
    
    const paymentLink = paymentLinkResponse.paymentLink;
    
    logger.debug('Checkout', 'Square Payment Link created successfully:', {
      paymentLinkId: paymentLink.id,
      orderId: paymentLink.orderId,
      url: paymentLink.url?.substring(0, 50) + '...'
    });
    
    // Store pre-order record in database for tracking
    try {
      const { db } = await connectToDatabase();
      const preOrder = {
        id: effectiveOrderId,
        squareOrderId: paymentLink.orderId,  // Order ID from payment link
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
    
    return json({
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
    
    // Capture error in Sentry with context
    const itemCount = 0;
    
    Sentry.captureException(error, {
       tags: {
         api: 'checkout',
         traceId: ctx.traceId,
        component: 'square_payment_link'
      },
      contexts: {
        checkout: {
          itemCount
        }
      }
    });
    
    // Log full error details for debugging
    if (error && typeof error === 'object') {
      console.error('Error details:', JSON.stringify(error, null, 2));
    }
    
    // Handle specific Square API errors
    if (error instanceof Error) {
      if (error.message.includes('CATALOG_OBJECT_NOT_FOUND')) {
        return json({ error: 'One or more products not found in Square catalog' }, 400);
      }

      if (error.message.includes('INVALID_LOCATION')) {
        return json({ error: 'Invalid location configuration' }, 500);
      }

      if (error.message.includes('UNAUTHORIZED')) {
        logSquareOperation('Checkout/Payment Link', false, { error: 'UNAUTHORIZED' });

        if (!shouldAllowFallback()) {
          const failureResponse = getAuthFailureResponse(error);
          return json(failureResponse, 500);
        }

        // Development fallback mode
        return json(
          {
            error: 'Square API authentication failed',
            fallbackMode: true,
            warning: 'Development mode - no real checkout links generated'
          },
          500
        );
      }
    }

    return json(
      {
        success: false,
        error: 'Failed to create checkout',
        details: sanitizeErrorMessage(error instanceof Error ? error.message : 'Unknown error')
      },
      500
    );
  }
}

// GET endpoint for checkout status
export async function GET(request: NextRequest) {
  const ctx = new RequestContext();

  try {
    const { searchParams } = new URL(request.url);
    const paymentLinkId = searchParams.get('paymentLinkId');
    const orderId = searchParams.get('orderId');
    
    // If no parameters, return service status
    if (!paymentLinkId && !orderId) {
      return NextResponse.json({
        service: 'Square Checkout API',
        status: 'active',
        configured: Boolean(process.env.SQUARE_LOCATION_ID && process.env.SQUARE_ACCESS_TOKEN),
        timestamp: new Date().toISOString(),
        traceId: ctx.traceId
      });
    }
    
    const square = getSquareClient();
    let result;
    
    if (paymentLinkId) {
      // Get payment link status
      const response = await square.checkout.paymentLinks.get({ id: paymentLinkId });
      result = response;
    } else if (orderId) {
      // Get order status
      const response = await square.orders.get({ orderId });
      result = response;
    }
    
    return NextResponse.json({
      success: true,
      data: result,
      message: 'Status retrieved successfully',
      traceId: ctx.traceId
    });

  } catch (error) {
    console.error('Get checkout status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve status',
        details: sanitizeErrorMessage(error instanceof Error ? error.message : 'Unknown error'),
        traceId: ctx.traceId
      },
      { status: 500 }
    );
  }
}
