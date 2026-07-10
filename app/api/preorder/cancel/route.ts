export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyOrderToken } from '@/lib/preorder/tokens';
import { findPreorder, updateConfirmationStatus, updatePreorderStatus } from '@/lib/preorder/repository';
import { logger } from '@/lib/logger';

/**
 * Cancel a preorder via a signed email link.
 *
 * GET /api/preorder/cancel?orderId=ORDER_NUMBER&token=SIGNED_TOKEN
 *
 * On success, redirects to the order status page with a cancellation message.
 * On failure, returns a clear error page/message.
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderId');
    const token = searchParams.get('token');

    if (!orderNumber || !token) {
      return errorResponse('Missing order number or cancellation token.', 400);
    }

    const verified = verifyOrderToken(token, 'cancel');
    if (!verified || verified.orderNumber !== orderNumber) {
      return errorResponse('This cancellation link is invalid or has expired.', 400);
    }

    const order = await findPreorder(orderNumber);
    if (!order) {
      return errorResponse('We could not find that preorder.', 404);
    }

    if (['PICKED_UP', 'FULFILLED', 'REFUNDED'].includes(order.status)) {
      return errorResponse('This order has already been picked up or finalized and cannot be cancelled here.', 400);
    }

    if (order.status === 'CANCELLED' || order.confirmationStatus === 'cancelled') {
      return redirectToStatus(orderNumber, 'already_cancelled');
    }

    await updatePreorderStatus(orderNumber, 'CANCELLED');
    await updateConfirmationStatus(orderNumber, 'cancelled');
    logger.info('PickupCancel', 'Order cancelled via email link', {
      orderNumber,
      marketId: order.marketId,
    });

    return redirectToStatus(orderNumber, 'cancelled');
  } catch (err: any) {
    logger.error('PickupCancel', 'Unexpected error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse('Something went wrong. Please contact us for help.', 500);
  }
}

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || 'https://tasteofgratitude.shop').replace(/\/$/, '');
}

function redirectToStatus(orderNumber: string, state: string) {
  const url = `${baseUrl()}/preorder/status?order=${encodeURIComponent(orderNumber)}&cancel=${state}`;
  return NextResponse.redirect(url, { status: 303 });
}

function errorResponse(message: string, status: number) {
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cancellation • Taste of Gratitude</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1c1917; max-width: 600px; margin: 0 auto; padding: 24px; }
      .box { border: 1px solid #e7e5e4; border-radius: 16px; padding: 24px; margin-top: 32px; }
      h1 { font-size: 22px; margin: 0 0 12px; }
      p { margin: 0 0 16px; }
      a { color: #047857; }
    </style>
  </head>
  <body>
    <div class="box">
      <h1>Could not cancel</h1>
      <p>${escapeHtml(message)}</p>
      <p><a href="${baseUrl()}/preorder/status">Check your order status →</a></p>
      <p>Questions? <a href="${baseUrl()}/contact">Contact Taste of Gratitude</a>.</p>
    </div>
  </body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
