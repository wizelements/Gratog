export const dynamic = 'force-dynamic';

/**
 * Preorder status API
 * GET  /api/preorder/status — Public redacted status by orderNumber or waitlistNumber
 * POST /api/preorder/status — Staff status update (requires PREORDER_STAFF_KEY)
 *
 * Returns real MongoDB data. 404 if not found — NO mocks.
 */

import { NextResponse } from 'next/server';
import {
  findPreorderByOrderNumber,
  findPreorderByWaitlistNumber,
  updatePreorderStatus,
} from '@/lib/preorder/repository';
import { createLogger } from '@/lib/logger';
import { preorderViewerHasPrivateAccess, publicPreorderStatus } from '@/lib/preorder/status-access';

const logger = createLogger('PreorderStatusAPI');

export async function GET(request: any) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber');
    const waitlistNumber = searchParams.get('waitlistNumber');
    const phone = searchParams.get('phone');

    // Phone numbers cannot be used as unauthenticated order-discovery keys.
    if (phone && !orderNumber && !waitlistNumber) {
      return NextResponse.json({ success: false, error: 'Use your preorder or waitlist reference to check status.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    if (!orderNumber && !waitlistNumber) {
      return NextResponse.json(
        { success: false, error: 'Order number or waitlist number required' },
        { status: 400 }
      );
    }

    let preorder = null;

    if (orderNumber) {
      preorder = await findPreorderByOrderNumber(orderNumber);
    } else if (waitlistNumber) {
      preorder = await findPreorderByWaitlistNumber(waitlistNumber);
    }

    if (!preorder) {
      return NextResponse.json(
        { success: false, error: 'Preorder not found' },
        { status: 404 }
      );
    }

    const allowed = preorderViewerHasPrivateAccess(preorder, request.headers.get('x-order-access-token'));
    const publicStatus = publicPreorderStatus(preorder, getStatusMessage(preorder.status), calculateReadyTime(preorder.queuePosition));
    if (!allowed) {
      return NextResponse.json({ success: true, preorder: publicStatus }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json({
      success: true,
      preorder: {
        ...publicStatus,
        privateDetailsAvailable: true,
        orderNumber: preorder.orderNumber,
        waitlistNumber: preorder.waitlistNumber,
        status: preorder.status,
        statusMessage: getStatusMessage(preorder.status),
        marketId: preorder.marketId,
        queuePosition: preorder.queuePosition ?? null,
        estimatedReadyTime: calculateReadyTime(preorder.queuePosition),
        pickupLocation: preorder.pickupLocation || preorder.marketName,
        pickupDate: preorder.pickupDate,
        pickupHours: preorder.pickupHours,
        items: preorder.items,
        subtotal: preorder.subtotal,
        total: preorder.total,
        paymentMethod: preorder.paymentMethod,
        paymentProvider: preorder.paymentProvider,
        paymentStatus: preorder.paymentStatus,
        amountPaid: preorder.amountPaid ?? 0,
        balanceDue: preorder.balanceDue ?? preorder.total,
        paymentUrl: preorder.paymentStatus === 'PENDING' ? preorder.paymentUrl || null : null,
        customer: {
          name: preorder.customerName,
          phone: preorder.customerPhone,
          email: preorder.customerEmail,
        },
        createdAt: preorder.createdAt,
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    logger.error('Preorder status error', { error: error.message });

    return NextResponse.json(
      { success: false, error: 'Failed to retrieve preorder status' },
      { status: 500 }
    );
  }
}

/**
 * Update preorder status (staff only)
 * POST /api/preorder/status
 */
export async function POST(request: any) {
  try {
    const data = await request.json();
    const { orderNumber, status, staffKey } = data;

    // Staff authentication
    const configuredStaffKey = process.env.PREORDER_STAFF_KEY;
    if (!configuredStaffKey || staffKey !== configuredStaffKey) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!orderNumber || !status) {
      return NextResponse.json(
        { success: false, error: 'orderNumber and status are required' },
        { status: 400 }
      );
    }

    const updated = await updatePreorderStatus(orderNumber, status);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Preorder not found' },
        { status: 404 }
      );
    }

    logger.info('Preorder status updated', {
      orderNumber,
      status,
      updatedBy: 'staff',
    });

    return NextResponse.json({
      success: true,
      preorder: {
        orderNumber: updated.orderNumber,
        status: updated.status,
      },
    });
  } catch (error: any) {
    logger.error('Preorder status update error', { error: error.message });

    return NextResponse.json(
      { success: false, error: 'Failed to update preorder status' },
      { status: 500 }
    );
  }
}

function getStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    PENDING_CONFIRMATION: 'Your preorder has been received and is awaiting confirmation.',
    CONFIRMED: "Your preorder is confirmed! We'll have it ready at the market.",
    PREPARING: 'Your preorder is being prepared now.',
    READY: 'Your order is ready for pickup!',
    PICKED_UP: 'Your order has been picked up. Thank you!',
    CANCELLED: 'This preorder has been cancelled.',
    REFUNDED: 'This preorder has been refunded.',
    PENDING_PAYMENT: 'Awaiting payment.',
  };
  return messages[status] || 'Status unknown';
}

function calculateReadyTime(position: number | null | undefined): string | null {
  if (!position) return null;

  const now = new Date();
  const marketOpen = new Date(now);
  marketOpen.setHours(9, 0, 0, 0);

  const minutesPerCustomer = 2.5;
  const estimatedMinutes = Math.ceil(position * minutesPerCustomer);

  const baseTime = now < marketOpen ? marketOpen : now;
  const readyTime = new Date(baseTime.getTime() + estimatedMinutes * 60000);
  return readyTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
