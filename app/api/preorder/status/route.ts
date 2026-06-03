export const dynamic = 'force-dynamic';

/**
 * Preorder status API
 * GET  /api/preorder/status — Look up by orderNumber, waitlistNumber, or phone
 * POST /api/preorder/status — Staff status update (requires PREORDER_STAFF_KEY)
 *
 * Returns real MongoDB data. 404 if not found — NO mocks.
 */

import { NextResponse } from 'next/server';
import {
  findPreorderByOrderNumber,
  findPreorderByWaitlistNumber,
  findPreorderByPhone,
  updatePreorderStatus,
} from '@/lib/preorder/repository';
import { createLogger } from '@/lib/logger';

const logger = createLogger('PreorderStatusAPI');

export async function GET(request: any) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber');
    const waitlistNumber = searchParams.get('waitlistNumber');
    const phone = searchParams.get('phone');

    if (!orderNumber && !waitlistNumber && !phone) {
      return NextResponse.json(
        { success: false, error: 'Order number, waitlist number, or phone required' },
        { status: 400 }
      );
    }

    let preorder = null;

    if (orderNumber) {
      preorder = await findPreorderByOrderNumber(orderNumber);
    } else if (waitlistNumber) {
      preorder = await findPreorderByWaitlistNumber(waitlistNumber);
    } else if (phone) {
      preorder = await findPreorderByPhone(phone);
    }

    if (!preorder) {
      return NextResponse.json(
        { success: false, error: 'Preorder not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      preorder: {
        orderNumber: preorder.orderNumber,
        waitlistNumber: preorder.waitlistNumber,
        status: preorder.status,
        statusMessage: getStatusMessage(preorder.status),
        queuePosition: preorder.queuePosition ?? null,
        estimatedReadyTime: calculateReadyTime(preorder.queuePosition),
        pickupLocation: preorder.pickupLocation || preorder.marketName,
        pickupDate: preorder.pickupDate,
        pickupHours: preorder.pickupHours,
        items: preorder.items,
        subtotal: preorder.subtotal,
        total: preorder.total,
        customer: {
          name: preorder.customerName,
          phone: preorder.customerPhone,
          email: preorder.customerEmail,
        },
        createdAt: preorder.createdAt,
      },
    });
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
    if (staffKey !== process.env.PREORDER_STAFF_KEY) {
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
