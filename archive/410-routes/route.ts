export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

/**
 * DEPRECATED — parallel checkout path.
 *
 * The canonical purchase flow is:
 *
 *   POST /api/orders/create   → /api/payments
 *
 * This endpoint historically created Square hosted-payment-link orders and
 * lived alongside the canonical Web Payments SDK flow. Two parallel
 * "checkout creator" routes are a revenue risk (REVENUE_RISK R-H2) — a stale
 * link or a marketing surface could send a customer down a path that no
 * longer feeds rewards/coupons/email correctly.
 *
 * It now returns 410 Gone so any caller surfaces loudly and we can repair
 * the link instead of silently losing the order.
 */
function gone() {
  return new NextResponse(
    JSON.stringify({
      success: false,
      error: 'This endpoint is no longer available. Use /api/orders/create then /api/payments.',
      code: 'CHECKOUT_PATH_DEPRECATED',
    }),
    {
      status: 410,
      headers: {
        'Content-Type': 'application/json',
        'Deprecation': 'true',
        'Sunset': 'Sat, 31 May 2026 00:00:00 GMT',
        'Link': '</api/orders/create>; rel="successor-version"',
      },
    }
  );
}

export async function GET() {
  return gone();
}
export async function POST() {
  return gone();
}
export async function PUT() {
  return gone();
}
export async function DELETE() {
  return gone();
}
