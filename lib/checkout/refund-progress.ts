/**
 * Reconcile cumulative, provider-verified refunds with a captured order.
 * Individual refund events cannot label the whole purchase as refunded.
 */
export function classifyCapturedRefund(paidCents: number, refundedCents: number): {
  fullyRefunded: boolean;
  paymentStatus: 'refunded' | 'partially_refunded';
} {
  if (!Number.isSafeInteger(paidCents) || paidCents <= 0
      || !Number.isSafeInteger(refundedCents) || refundedCents <= 0
      || refundedCents > paidCents) {
    throw new Error('Refund amount cannot be reconciled to the captured order total');
  }
  const fullyRefunded = refundedCents === paidCents;
  return { fullyRefunded, paymentStatus: fullyRefunded ? 'refunded' : 'partially_refunded' };
}
