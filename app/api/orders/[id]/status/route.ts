export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { AdminAuthError, getAdminSession, requireAdminSession } from '@/lib/auth/unified-admin';
import { verifyRequestAuthentication } from '@/lib/rewards-security';
import { verifyOrderAccessToken } from '@/lib/order-access-token';
import { getTursoPreviewOrder } from '@/lib/checkout/turso-order-read.mjs';
import { TursoPreviewRefusal } from '@/lib/checkout/turso-preview-runtime.mjs';

// This endpoint changes fulfillment only. Payment and refund transitions belong
// to the provider-verified payment/refund handlers, including for administrators.
const VALID_ORDER_STATUSES = [
  'pending', 'confirmed', 'making', 'preparing', 'ready', 'completed',
  'cancelled', 'delivered', 'picked_up', 'shipped', 'fulfilled',
  'PENDING_CONFIRMATION', 'CONFIRMED', 'PREPARING', 'READY',
  'PICKED_UP', 'CANCELLED', 'PREORDER_CONFIRMED', 'PREORDER_PREPARE',
  'PREORDER_READY', 'SHIPPING_CONFIRMED', 'SHIPPING_SHIPPED',
  'SHIPPING_DELIVERED', 'COMPLETED',
];

const PAYMENT_OWNED_STATUSES = new Set([
  'paid', 'payment_completed', 'payment_processing', 'pending_payment',
  'preorder_pending_payment', 'shipping_pending_payment', 'refunded',
  'partially_refunded', 'partial_refund',
]);
const usesTurso = () => String(process.env.DATABASE_PROVIDER || '').trim().toLowerCase() === 'turso';
const json = (body: unknown, status = 200) => NextResponse.json(body, {
  status,
  headers: {
    'Cache-Control': 'private, no-store',
    Vary: 'Cookie, Authorization, X-Order-Access-Token',
    'Referrer-Policy': 'no-referrer',
  },
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || id.length > 200) return json({ success: false, error: 'Invalid order reference' }, 400);

    const token = request.headers.get('x-order-access-token') || new URL(request.url).searchParams.get('token');
    const auth = await verifyRequestAuthentication(request, { allowPublic: true });
    const preliminaryToken = verifyOrderAccessToken(token);
    let admin = !preliminaryToken && !auth?.authenticated ? await getAdminSession(request) : null;
    // A human-readable order reference is not a credential. Invalid or absent
    // credentials must not even trigger an order lookup.
    if (!preliminaryToken && !auth?.authenticated && !admin) {
      return json({ success: false, error: 'Unauthorized' }, 401);
    }

    let order: any;
    if (usesTurso()) {
      // Provider selection is exclusive: a Turso miss/outage never falls back to Mongo.
      order = await getTursoPreviewOrder(id);
    } else {
      const { db } = await connectToDatabase();
      const query = { $or: [{ id }, { orderNumber: id }, { orderRef: id }, { _id: id }] };
      order = await db.collection('orders').findOne(query);
      if (!order) order = await db.collection('marketorders').findOne(query);
    }

    if (!order) {
      return json({ success: false, error: 'Order not found' }, 404);
    }

    const email = String(order.customer?.email || order.customerEmail || '').trim().toLowerCase();
    // Legacy market links used a stored order number. Canonical checkout links
    // use the order ID. Every accepted identity comes from this database row.
    const identities = usesTurso()
      ? [order.id]
      : [order.id, order._id?.toString(), order.orderNumber, order.orderRef];
    const tokenAccess = identities.some(identity => typeof identity === 'string' && identity &&
      verifyOrderAccessToken(token, { expectedOrderId: identity, expectedEmail: email || null }));
    const ownerAccess = Boolean(email && auth?.authenticated &&
      String(auth.userEmail || '').trim().toLowerCase() === email);
    const internalAccess = Boolean(auth?.authenticated &&
      ['master_key', 'admin_key'].includes(auth.authType || ''));
    if (!tokenAccess && !ownerAccess && !internalAccess && !admin) {
      admin = await getAdminSession(request);
    }
    if (!tokenAccess && !ownerAccess && !internalAccess && !admin) {
      return json({ success: false, error: 'Unauthorized' }, 401);
    }

    return json({
      success: true,
      order: {
        id: order.id || order._id?.toString(),
        orderNumber: order.orderNumber || order.orderRef || order.id,
        status: order.status || 'pending',
        paymentStatus: order.paymentStatus,
        items: order.items || [],
        total: order.pricing?.total ?? order.total ?? 0,
        fulfillment: order.fulfillment || order.fulfillmentType ? {
          type: order.fulfillmentType || order.fulfillment?.type,
          address: order.shippingAddress || order.fulfillment?.address,
        } : null,
        customerName: order.customerName || order.customer?.name,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        estimatedReady: order.estimatedReady,
        estimatedReadyAt: order.estimatedReadyAt || order.estimatedReady || null,
        estimatedMinutes: order.estimatedMinutes ?? null,
        pickedUpAt: order.pickedUpAt || null,
        queuePosition: order.queuePosition,
      },
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return json({ success: false, error: error.statusCode === 503 ?
        'Administrator verification is temporarily unavailable' : 'Unauthorized' }, error.statusCode || 401);
    }
    if (error instanceof TursoPreviewRefusal) {
      return json({ success: false, error: 'Order status is temporarily unavailable', code: error.code }, error.status);
    }
    console.error('Order status error:', error);
    return json({ success: false, error: 'Failed to fetch order status' }, 500);
  }
}

async function updateOrderStatus(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // The Mongo-only fulfillment writer must never run under a Turso selection,
    // including indirectly through the Mongo-backed administrator lookup.
    if (usesTurso()) {
      return json({ success: false, error: 'Order changes are unavailable until Turso fulfillment is certified',
        code: 'TURSO_FULFILLMENT_WRITE_NOT_CERTIFIED' }, 503);
    }
    const admin = await requireAdminSession(request);
    const { id } = await params;
    if (!id || id.length > 200) return json({ success: false, error: 'Invalid order reference' }, 400);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return json({ success: false, error: 'Invalid status update' }, 400);
    }
    const { status, estimatedReady } = body;
    if (Object.prototype.hasOwnProperty.call(body, 'paymentStatus') ||
        (typeof status === 'string' && PAYMENT_OWNED_STATUSES.has(status.toLowerCase()))) {
      return json({ success: false, error: 'Payment and refund status require verified provider reconciliation',
        code: 'PAYMENT_STATE_REQUIRES_VERIFICATION' }, 409);
    }
    if (!status && !estimatedReady) {
      return json({ success: false, error: 'Status update is required' }, 400);
    }

    if (status !== undefined && (typeof status !== 'string' || !VALID_ORDER_STATUSES.includes(status))) {
      return json({ success: false, error: 'Invalid status' }, 400);
    }

    if (estimatedReady !== undefined && (typeof estimatedReady !== 'string' ||
        estimatedReady.length > 100 || !Number.isFinite(Date.parse(estimatedReady)))) {
      return json({ success: false, error: 'Invalid estimated ready time' }, 400);
    }

    const { db } = await connectToDatabase();
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      statusUpdatedBy: admin.email,
    };
    if (status) updateData.status = status;
    if (estimatedReady) updateData.estimatedReady = new Date(estimatedReady).toISOString();

    const result = await db.collection('marketorders').findOneAndUpdate(
      { $or: [{ orderNumber: id }, { orderRef: id }] },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return json({ success: false, error: 'Order not found' }, 404);
    }

    return json({
      success: true,
      order: {
        orderNumber: result.orderNumber || result.orderRef,
        status: result.status,
        paymentStatus: result.paymentStatus,
        updatedAt: result.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return json(
        { success: false, error: error.statusCode === 401 ? 'Unauthorized' : 'Admin authentication failed' },
        error.statusCode || 401
      );
    }

    console.error('Order status update error:', error);
    return json({ success: false, error: 'Failed to update order status' }, 500);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return updateOrderStatus(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return updateOrderStatus(request, context);
}
