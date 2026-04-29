export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { createLogger } from '@/lib/logger';
import { verifyRequestAuthentication } from '@/lib/rewards-security';
import { verifyOrderAccessToken } from '@/lib/order-access-token';

const logger = createLogger('OrderDetailsAPI');

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

function canAccessOrder(auth, order) {
  if (!auth?.authenticated || !order) {
    return false;
  }

  if (isInternalPrincipal(auth)) {
    return true;
  }

  const orderEmail = String(order.customer?.email || order.customerEmail || '').trim().toLowerCase();
  const userEmail = String(auth.userEmail || '').trim().toLowerCase();
  return orderEmail.length > 0 && orderEmail === userEmail;
}

function sanitizeOrder(order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    paidAt: order.paidAt || null,
    customer: {
      name: order.customer?.name,
      email: order.customer?.email,
      phone: order.customer?.phone,
    },
    items: order.items,
    pricing: order.pricing,
    fulfillmentType: order.fulfillmentType || order.fulfillment?.type || null,
    fulfillment: order.fulfillment,
    deliveryAddress: order.deliveryAddress || order.fulfillment?.deliveryAddress || null,
    orderTiming: order.orderTiming || order.fulfillment?.timing || null,
    payment: {
      status: order.payment?.status || order.paymentStatus || order.status,
      receiptUrl: order.receiptUrl || order.payment?.receiptUrl || null,
      cardBrand: order.cardBrand || order.payment?.cardBrand || null,
      cardLast4: order.cardLast4 || order.payment?.cardLast4 || null,
      receiptNumber: order.payment?.receiptNumber || null,
    },
  };
}

export async function GET(request, { params }) {
  const startTime = Date.now();
  
  try {
    const { id } = await params; // Await params in Next.js 15+
    const { searchParams } = new URL(request.url);
    const orderAccessToken = searchParams.get('token');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }
    
    logger.info('Fetching order details', { orderId: id });

    const auth = await verifyRequestAuthentication(request, { allowPublic: true });
    const { db } = await connectToDatabase();

    const order = await db.collection('orders').findOne({ id })
      || await db.collection('orders').findOne({ _id: id });
    
    if (!order) {
      logger.warn('Order not found', { orderId: id });
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const tokenClaims = verifyOrderAccessToken(orderAccessToken, {
      expectedOrderId: order.id,
      expectedEmail: order.customer?.email || order.customerEmail || null,
    });

    if (!tokenClaims && !canAccessOrder(auth, order)) {
      logger.warn('Unauthorized order-details access attempt', {
        orderId: id,
        hasToken: Boolean(orderAccessToken),
        hasAuth: Boolean(auth?.authenticated),
      });
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        {
          status: 401,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }
    
    logger.info('Order retrieved successfully', { 
      orderId: id,
      duration: Date.now() - startTime 
    });
    
    return NextResponse.json(
      {
        success: true,
        order: sanitizeOrder(order)
      },
      {
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    );
    
  } catch (error) {
    logger.error('Failed to fetch order', { 
      error: error.message,
      stack: error.stack 
    });
    
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve order details' },
      { status: 500 }
    );
  }
}
