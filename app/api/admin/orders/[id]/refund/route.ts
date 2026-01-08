import { NextRequest, NextResponse } from 'next/server';
import { createRefund } from '@/lib/square-api';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import { getAdminFromRequest } from '@/lib/admin-auth';

/**
 * Admin Refund API - Process refunds for completed orders
 * 
 * POST /api/admin/orders/[id]/refund
 * Body: { amount?: number, reason?: string }
 * 
 * If amount is not provided, full refund is issued.
 * Amount is in CENTS.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const authResult = { authorized: true, adminEmail: admin.email };

    const { id } = await params;
    const orderId = id;
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { amount, reason = 'requested_by_customer' } = body;

    const { db } = await connectToDatabase();
    const order = await db.collection('orders').findOne({ id: orderId });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (!order.squarePaymentId) {
      return NextResponse.json(
        { error: 'No payment found for this order' },
        { status: 400 }
      );
    }

    const paidStatuses = ['paid', 'COMPLETED', 'completed', 'payment_completed'];
    if (!paidStatuses.includes(order.status) && !paidStatuses.includes(order.paymentStatus)) {
      return NextResponse.json(
        { error: 'Order has not been paid yet' },
        { status: 400 }
      );
    }

    if (order.refundStatus === 'refunded' || order.refundStatus === 'partial_refund') {
      return NextResponse.json(
        { error: 'Order has already been refunded' },
        { status: 400 }
      );
    }

    const refundAmountCents = amount || order.totalCents || 
      (order.pricing?.total ? Math.round(order.pricing.total * 100) : 0);

    if (!refundAmountCents || refundAmountCents <= 0) {
      return NextResponse.json(
        { error: 'Invalid refund amount' },
        { status: 400 }
      );
    }

    logger.info('Admin', 'Processing refund', {
      orderId,
      paymentId: order.squarePaymentId,
      amountCents: refundAmountCents,
      reason,
      admin: authResult.adminEmail
    });

    const refundResult = await createRefund({
      paymentId: order.squarePaymentId,
      amountCents: refundAmountCents,
      reason
    });

    if (!refundResult.success || !refundResult.data?.refund) {
      const errorMsg = refundResult.errors?.[0]?.detail || 'Refund failed';
      logger.error('Admin', 'Refund failed', { orderId, error: errorMsg });
      return NextResponse.json(
        { error: errorMsg },
        { status: 400 }
      );
    }

    const refund = refundResult.data.refund;
    const orderTotalCents = order.totalCents || 
      (order.pricing?.total ? Math.round(order.pricing.total * 100) : 0);
    const isFullRefund = refundAmountCents >= orderTotalCents;

    await db.collection('orders').updateOne(
      { id: orderId },
      {
        $set: {
          status: isFullRefund ? 'refunded' : 'partial_refund',
          refundStatus: isFullRefund ? 'refunded' : 'partial_refund',
          refundId: refund.id,
          refundAmountCents,
          refundReason: reason,
          refundedAt: new Date().toISOString(),
          refundedBy: authResult.adminEmail,
          updatedAt: new Date().toISOString()
        },
        $push: {
          timeline: {
            status: isFullRefund ? 'refunded' : 'partial_refund',
            timestamp: new Date(),
            message: `${isFullRefund ? 'Full' : 'Partial'} refund of $${(refundAmountCents / 100).toFixed(2)} processed`,
            actor: authResult.adminEmail,
            refundId: refund.id
          }
        }
      }
    );

    logger.info('Admin', 'Refund completed', {
      orderId,
      refundId: refund.id,
      amountCents: refundAmountCents,
      isFullRefund
    });

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        status: refund.status,
        amountCents: refund.amountMoney?.amount,
        createdAt: refund.createdAt
      },
      order: {
        id: orderId,
        status: isFullRefund ? 'refunded' : 'partial_refund'
      }
    });

  } catch (error) {
    logger.error('Admin', 'Refund error', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    );
  }
}
