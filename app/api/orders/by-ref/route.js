import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { orderTracking } from '@/lib/enhanced-order-tracking';
import { createLogger } from '@/lib/logger';
import { verifyRequestAuthentication } from '@/lib/rewards-security';
import { verifyOrderAccessToken } from '@/lib/order-access-token';

const logger = createLogger('OrdersByRefAPI');

function isInternalPrincipal(auth) {
  return (
    auth?.authenticated && (
      auth.authType === 'master_key' ||
      auth.authType === 'admin_key' ||
      auth.userId === 'system' ||
      auth.userId === 'admin'
    )
  );
}

/**
 * Fetch order by orderRef (orderId) - Stateless, no cookies required
 * Used by success page to retrieve order details after payment
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderRef = searchParams.get('orderRef');
    const orderAccessToken = searchParams.get('token');
    
    if (!orderRef) {
      logger.warn('Missing orderRef parameter');
      return NextResponse.json(
        { error: 'orderRef parameter is required' },
        { status: 400 }
      );
    }
    
    logger.info('Fetching order by ref', { orderRef });

    const auth = await verifyRequestAuthentication(request, { allowPublic: true });

    if (!orderAccessToken && !auth?.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        {
          status: 401,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }
    
    let order = null;
    let isFallback = false;

    try {
      const { db } = await connectToDatabase();
      order = await db.collection('orders').findOne({ id: orderRef });
      
      // If not found in orders collection, check MarketOrder
      if (!order) {
        const MarketOrder = (await import('@/models/MarketOrder')).default;
        const marketOrder = await MarketOrder.findOne({ orderNumber: orderRef });
        if (marketOrder) {
          // Transform MarketOrder to match orders collection format
          order = {
            id: marketOrder._id.toString(),
            orderNumber: marketOrder.orderNumber,
            status: marketOrder.status,
            paymentStatus: marketOrder.paymentStatus,
            total: marketOrder.total,
            customer: {
              name: marketOrder.customerName,
              email: marketOrder.customerEmail,
              phone: marketOrder.customerPhone,
            },
            items: marketOrder.items,
            pricing: {
              subtotal: marketOrder.subtotal,
              tax: marketOrder.tax,
              total: marketOrder.total,
            },
            fulfillmentType: 'pickup_market',
            createdAt: marketOrder.createdAt,
            paidAt: marketOrder.paymentStatus === 'PAID' ? marketOrder.updatedAt : null,
            isMarketOrder: true,
          };
        }
      }
    } catch (dbError) {
      logger.warn('Primary order lookup failed, attempting fallback lookup', {
        orderRef,
        error: dbError?.message || String(dbError),
      });
    }

    if (!order) {
      const fallbackResult = await orderTracking.getOrder(orderRef);
      if (fallbackResult?.success && fallbackResult.order?.id) {
        order = fallbackResult.order;
        isFallback = Boolean(fallbackResult.isFallback || fallbackResult.order.isFallback);
      }
    }

    if (!order) {
      logger.warn('Order not found', { orderRef });
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const trustedOrderEmail = String(order.customer?.email || '').trim().toLowerCase();
    const expectedEmail = trustedOrderEmail && trustedOrderEmail !== 'unknown@example.com'
      ? trustedOrderEmail
      : null;

    const tokenClaims = verifyOrderAccessToken(orderAccessToken, {
      expectedOrderId: order.id || orderRef,
      expectedEmail,
    });

    const ownerAccess =
      auth?.authenticated &&
      String(auth.userEmail || '').trim().toLowerCase() ===
        trustedOrderEmail;

    if (!tokenClaims && !ownerAccess && !isInternalPrincipal(auth)) {
      logger.warn('Unauthorized order-by-ref access attempt', {
        orderRef,
        hasToken: Boolean(orderAccessToken),
        hasAuth: Boolean(auth?.authenticated),
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        {
          status: 401,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }
    
    logger.info('Order found', { 
      orderRef, 
      status: order.status,
      orderNumber: order.orderNumber,
      isFallback,
    });
    
    const deliveryAddress = order.deliveryAddress || order.fulfillment?.deliveryAddress || null;
    const fulfillmentType = order.fulfillmentType || order.fulfillment?.type || 'pickup_market';
    const orderTiming = order.orderTiming || order.fulfillment?.timing || null;

    // Return only the fields needed for customer-facing order success rendering.
    return NextResponse.json(
      {
        orderRef: order.id,
        orderNumber: order.orderNumber,
        isFallback,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.pricing?.total || order.total,
        customer: {
          name: order.customer?.name,
          email: order.customer?.email,
        },
        items: order.items,
        pricing: order.pricing,
        payment: {
          status: order.payment?.status || order.paymentStatus || order.status,
          receiptUrl: order.receiptUrl || order.payment?.receiptUrl || null,
          cardBrand: order.cardBrand || order.payment?.cardBrand || null,
          cardLast4: order.cardLast4 || order.payment?.cardLast4 || null,
          receiptNumber: order.payment?.receiptNumber || null,
        },
        createdAt: order.createdAt,
        paidAt: order.paidAt || null,
        fulfillmentType,
        deliveryAddress,
        orderTiming,
        fulfillment: {
          ...(order.fulfillment || {}),
          type: fulfillmentType,
          address: deliveryAddress,
          timing: orderTiming,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
    
  } catch (error) {
    logger.error('Error fetching order by ref', { 
      error: error.message,
      stack: error.stack 
    });
    
    return NextResponse.json(
      { error: 'Failed to fetch order details', details: error.message },
      { status: 500 }
    );
  }
}
