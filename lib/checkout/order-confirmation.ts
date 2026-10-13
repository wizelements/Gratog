/**
 * Customer receipt status must be based on a server-stored captured payment,
 * never on a URL query parameter or a mere Square APPROVED authorization.
 */
export function isServerVerifiedPaidOrder(order: {
  paymentStatus?: unknown;
  payment?: { status?: unknown } | null;
} | null | undefined): boolean {
  if (!order) return false;
  const captured = new Set(['COMPLETED', 'PAID', 'PAID_IN_FULL', 'DEPOSIT_PAID', 'FULLY_PAID', 'PAID_PARTIAL']);
  const statuses = [order.paymentStatus, order.payment?.status];
  return statuses.some(status => typeof status === 'string' && captured.has(status.trim().toUpperCase()));
}
