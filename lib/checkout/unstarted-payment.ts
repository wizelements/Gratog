/**
 * Only orders with no evidence that a payment was even attempted may be
 * abandoned automatically. All ambiguous in-flight orders require provider
 * reconciliation before stock holds or order state can be released.
 */
export const UNSTARTED_PAYMENT_STATUSES = ['pending', 'PENDING', 'PENDING_PAYMENT'] as const;

export function unstartedPaymentMatch() {
  return {
    paymentStatus: { $in: [...UNSTARTED_PAYMENT_STATUSES] },
    paymentAttemptedAt: { $exists: false },
    paymentIdempotencyKey: { $exists: false },
  };
}

/** Preserve the payment-state predicates at the write boundary, not only on the earlier read. */
export function guardedAbandonmentWriteFilter(orderIds: string[], candidateFilter: Record<string, unknown>) {
  return { $and: [{ id: { $in: orderIds } }, candidateFilter] };
}
