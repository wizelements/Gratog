/**
 * Customer receipt status must be based on a server-stored captured payment,
 * never on a URL query parameter or a mere Square APPROVED authorization.
 */
export function isServerVerifiedPaidOrder(order: {
  status?: unknown;
  paymentStatus?: unknown;
  payment?: { status?: unknown } | null;
} | null | undefined): boolean {
  if (!order) return false;
  const captured = new Set(['COMPLETED', 'PAID', 'PAID_IN_FULL', 'FULLY_PAID']);
  const statuses = [order.paymentStatus, order.payment?.status];
  const terminal = new Set(['REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED', 'CANCELED', 'FAILED']);
  if ([order.status, ...statuses].some(status => typeof status === 'string' && terminal.has(status.trim().toUpperCase()))) {
    return false;
  }
  return statuses.some(status => typeof status === 'string' && captured.has(status.trim().toUpperCase()));
}
