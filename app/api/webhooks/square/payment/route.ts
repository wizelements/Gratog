export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import { isValidReservationPaymentTransition } from '@/lib/batches/state-machine';
import { logPaymentReceived, logReservationStatusChange } from '@/lib/batches/audit-log';
import type { BatchReservation } from '@/lib/batches/types';

/**
 * Square payment webhook for fresh-batch reservations.
 *
 * Square sends `payment.created` or `payment.updated` events.
 * We reconcile the reservation payment status by matching the Square
 * order ID stored on `batch_reservations`.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-square-signature');
  const secret = process.env.SQUARE_WEBHOOK_SECRET;
  if (secret && !signature) {
    return NextResponse.json({ success: false, error: 'Missing signature' }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const event = raw as {
    type?: string;
    data?: {
      type?: string;
      id?: string;
      object?: {
        payment?: {
          order_id?: string;
          amount_money?: { amount: number; currency: string };
          status?: string;
          id?: string;
        };
      };
    };
  };

  const eventType = event.type || event.data?.type;
  const payment = event.data?.object?.payment;
  if (!payment?.order_id) {
    return NextResponse.json({ success: false, error: 'No payment order_id' }, { status: 400 });
  }

  try {
    const { db } = await connectToDatabase();
    const reservation = await db
      .collection<BatchReservation>('batch_reservations')
      .findOne({ squareOrderId: payment.order_id });

    if (!reservation) {
      // Not a fresh-batch reservation; ignore silently.
      return NextResponse.json({ success: true, ignored: true }, { status: 200 });
    }

    const amountCents = payment.amount_money?.amount ?? reservation.finalPriceCents;
    const paymentStatus = payment.status?.toUpperCase();
    const previousStatus = reservation.paymentStatus;

    let newStatus: BatchReservation['paymentStatus'] | null = null;

    if (paymentStatus === 'COMPLETED' || paymentStatus === 'APPROVED') {
      if (amountCents >= reservation.finalPriceCents) {
        newStatus = 'fully_paid';
      } else if (amountCents >= reservation.depositCents) {
        newStatus = 'deposit_paid';
      }
    } else if (['FAILED', 'CANCELED'].includes(paymentStatus || '')) {
      newStatus = 'failed';
    }

    if (!newStatus) {
      return NextResponse.json({ success: true, ignored: true, reason: 'No status change' }, { status: 200 });
    }

    if (!isValidReservationPaymentTransition(previousStatus, newStatus)) {
      return NextResponse.json(
        { success: false, error: 'Invalid reservation payment transition' },
        { status: 409 }
      );
    }

    await db.collection('batch_reservations').updateOne(
      { id: reservation.id },
      { $set: { paymentStatus: newStatus, updatedAt: new Date() } }
    );

    logPaymentReceived(reservation.id, payment.id || 'unknown', amountCents, newStatus).catch(
      (err) =>
        logger.warn('SquareWebhook', 'Audit log failed', {
          reservationId: reservation.id,
          error: err instanceof Error ? err.message : String(err),
        })
    );

    if (previousStatus !== newStatus) {
      logReservationStatusChange(
        reservation.id,
        'square_webhook',
        previousStatus,
        newStatus,
        `Square payment ${paymentStatus}`,
        { squarePaymentId: payment.id, amountCents }
      ).catch(() => undefined);
    }

    return NextResponse.json({ success: true, data: { reservationId: reservation.id, paymentStatus: newStatus } });
  } catch (error) {
    logger.error('SquareWebhook', 'Failed to reconcile payment', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: 'Reconciliation failed' }, { status: 500 });
  }
}
