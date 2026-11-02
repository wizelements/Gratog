import { verifyOrderAccessToken } from '@/lib/order-access-token';

/**
 * Market queue references are human-friendly and guessable, NOT bearer tokens.
 * The public view omits names, phone, email, item history, money and Square URL.
 */
export function preorderViewerHasPrivateAccess(preorder: any, token: string | null): boolean {
  if (!preorder || !token) return false;
  return Boolean(verifyOrderAccessToken(token, {
    expectedOrderId: preorder.orderNumber,
    expectedEmail: preorder.customerEmail || null,
  }));
}

export function publicPreorderStatus(preorder: any, statusMessage: string, estimatedReadyTime?: string | null) {
  return {
    orderNumber: preorder.orderNumber,
    waitlistNumber: preorder.waitlistNumber,
    status: preorder.status,
    statusMessage,
    marketId: preorder.marketId,
    queuePosition: preorder.queuePosition ?? null,
    estimatedReadyTime: estimatedReadyTime || null,
    pickupLocation: preorder.pickupLocation || preorder.marketName,
    pickupDate: preorder.pickupDate,
    pickupHours: preorder.pickupHours,
    paymentStatus: preorder.paymentStatus,
    // No personal details, items, costs or checkout links for anonymous users.
    privateDetailsAvailable: false,
  };
}
