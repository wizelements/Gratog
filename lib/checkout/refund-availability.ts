import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthError, requireAdminSession } from '@/lib/auth/unified-admin';

/** Temporary safety gate, not a completed refund implementation.
 * Legacy handlers generated new keys on retries, marked partial refunds complete,
 * and restocked without return evidence. Retain the provider-verified webhook
 * ledger, but require a certified durable request workflow before new refunds.
 * No Square, order, or inventory mutation occurs in this handler.
 */
export async function blockedRefund(request: NextRequest) {
  try {
    await requireAdminSession(request);
    return NextResponse.json({ success: false, code: 'REFUND_REQUEST_WORKFLOW_NOT_CERTIFIED',
      error: 'In-app refunds are temporarily unavailable. An authorized operator must reconcile the payment in Square before issuing a refund there. Inventory must be reviewed separately.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Administrator authentication required' },
      { status: error instanceof AdminAuthError ? error.statusCode : 503,
        headers: { 'Cache-Control': 'no-store' } });
  }
}
