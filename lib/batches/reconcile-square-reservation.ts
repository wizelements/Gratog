import { isValidReservationPaymentTransition } from './state-machine';
import { logPaymentReceived, logReservationStatusChange } from './audit-log';
import type { BatchReservation } from './types';

/**
 * Shared by both Square webhook endpoints, after signature validation.
 * Only COMPLETED USD payments count; an APPROVED authorization is not cash.
 * Each Square payment ID can be counted once, regardless of retried events.
 */
export async function reconcileSquareBatchReservation(db: any, payment: any):
  Promise<{ matched: boolean; applied: boolean; paymentStatus?: string }> {
  if (!payment?.order_id) return { matched: false, applied: false };
  const reservations = db.collection('batch_reservations');
  const reservation = await reservations.findOne({ squareOrderId: payment.order_id });
  if (!reservation) return { matched: false, applied: false };

  const status = String(payment.status || '').toUpperCase();
  const id = typeof payment.id === 'string' ? payment.id : '';
  const amountCents = payment.amount_money?.amount;
  const currency = payment.amount_money?.currency;

  if (status !== 'COMPLETED' || !id || currency !== 'USD' ||
      !Number.isSafeInteger(amountCents) || amountCents <= 0) {
    return { matched: true, applied: false, paymentStatus: reservation.paymentStatus };
  }
  if (['fully_paid', 'refunded', 'canceled'].includes(reservation.paymentStatus) ||
      (reservation.processedSquarePaymentIds || []).includes(id)) {
    return { matched: true, applied: false, paymentStatus: reservation.paymentStatus };
  }

  const previous = reservation.paymentStatus as BatchReservation['paymentStatus'];
  const previouslyCaptured = Number.isSafeInteger(reservation.capturedAmountCents)
    ? Math.max(0, reservation.capturedAmountCents)
    : previous === 'deposit_paid' ? reservation.depositCents : 0;
  const totalCaptured = previouslyCaptured + amountCents;
  if (!Number.isSafeInteger(totalCaptured)) throw new Error('Invalid captured amount');

  const fullPrice = reservation.finalPriceCents;
  const deposit = reservation.depositCents;
  if (!Number.isSafeInteger(fullPrice) || fullPrice <= 0 ||
      !Number.isSafeInteger(deposit) || deposit < 0 || deposit > fullPrice) {
    throw new Error('Reservation amount mismatch');
  }
  const next: BatchReservation['paymentStatus'] =
    totalCaptured >= fullPrice ? 'fully_paid' :
    totalCaptured >= (deposit || fullPrice) ? 'deposit_paid' : previous;
  if (!isValidReservationPaymentTransition(previous, next)) {
    throw new Error('Invalid reservation payment transition');
  }

  // Optimistic status comparison + payment-ID dedupe. Webhook retries and
  // overlapping deliveries must never increment the captured amount twice.
  const updated = await reservations.updateOne(
    { id: reservation.id, paymentStatus: previous, processedSquarePaymentIds: { $ne: id } },
    {
      $set: { paymentStatus: next, capturedAmountCents: totalCaptured, updatedAt: new Date() },
      $addToSet: { processedSquarePaymentIds: id },
    }
  );
  if (updated.modifiedCount !== 1) {
    // Concurrent event: request a retry so the payment can be reconciled against
    // the latest ledger instead of being acknowledged and dropped.
    throw new Error('Concurrent reservation update; retry reconciliation');
  }

  await Promise.allSettled([
    logPaymentReceived(reservation.id, id, amountCents, next),
    ...(previous !== next
      ? [logReservationStatusChange(reservation.id, 'square_webhook', previous, next,
          'Square completed payment', { squarePaymentId: id, amountCents })]
      : []),
  ]);
  return { matched: true, applied: true, paymentStatus: next };
}
