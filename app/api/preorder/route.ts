export const dynamic = 'force-dynamic';

/**
 * Preorder API route
 * POST /api/preorder  — Create preorder (persisted to MongoDB marketorders)
 * GET  /api/preorder?orderNumber=PRE-xxx — Look up real preorder (404 if missing)
 */

import { NextResponse } from 'next/server';
import { generatePreorderNumber, getEstimatedWaitTime } from '@/lib/preorder/waitlist';
import { getNextWaitlistNumber, createPreorder, findPreorderByOrderNumber } from '@/lib/preorder/repository';
import { MARKET_CONFIGS, isValidMarketId, getNextMarketDate, PREORDER_RULES } from '@/lib/preorder/rules';
import { notifySquareTeam } from '@/lib/preorder/square-notifications';
import { createLogger } from '@/lib/logger';
import { sanitizeObject } from '@/lib/validation/sanitize';
import { validateCustomerData } from '@/lib/validation/customer';
import { validatePreorderMinimum } from '@/lib/cart-engine';

const logger = createLogger('PreorderAPI');

export async function POST(request: any) {
  try {
    let data = await request.json();

    // Sanitize input
    data = sanitizeObject(data, { preventSQL: true });

    logger.info('Preorder request received', {
      customerName: data.customer?.name,
      marketId: data.marketId,
      itemCount: data.items?.length,
    });

    // Validate market
    if (!data.marketId || !isValidMarketId(data.marketId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing market selection' },
        { status: 400 }
      );
    }

    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Your preorder is empty' },
        { status: 400 }
      );
    }

    // Validate customer
    const customerValidation = validateCustomerData(data.customer);
    if (!customerValidation.valid) {
      return NextResponse.json(
        { success: false, error: customerValidation.error },
        { status: 400 }
      );
    }

    const preorderCartItems = data.items.map((item: any) => ({
      ...item,
      id: item.productId || item.id,
      productId: item.productId || item.id,
      variationId: item.variationId || item.productId || item.id,
      catalogObjectId: item.catalogObjectId || item.variationId || item.productId || item.id,
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
      isPreorder: true,
      category: item.category || '',
      name: item.name || '',
    }));

    // Calculate totals
    const subtotal = preorderCartItems.reduce((sum: number, item: any) => {
      return sum + ((item.price || 0) * (item.quantity || 1));
    }, 0);

    // Preorder rules: $60 minimum
    const preorderValidation = validatePreorderMinimum(preorderCartItems as any);
    if (!preorderValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: preorderValidation.error,
          code: preorderValidation.code,
          minimum: preorderValidation.minimumRequired,
          current: preorderValidation.preorderSubtotal,
        },
        { status: 400 }
      );
    }

    // Get market info from centralized config
    const marketConfig = MARKET_CONFIGS[data.marketId as keyof typeof MARKET_CONFIGS];
    const pickupDate = getNextMarketDate(marketConfig.day);
    const pickupDateStr = pickupDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    // Atomic waitlist number from MongoDB
    const { waitlistNumber, counter } = await getNextWaitlistNumber(
      data.marketId,
      marketConfig.prefix,
      pickupDate
    );

    const orderNumber = generatePreorderNumber();
    const total = subtotal; // TAX_RATE is 0 for market sales

    const items = preorderCartItems.map((item: any) => ({
      productId: item.productId || item.id,
      name: item.name,
      quantity: item.quantity || 1,
      price: item.price || 0,
      subtotal: (item.price || 0) * (item.quantity || 1),
      size: item.size || null,
      imageUrl: item.imageUrl || null,
    }));

    // Persist to MongoDB marketorders collection
    const dbOrder = await createPreorder({
      orderNumber,
      waitlistNumber,
      marketId: data.marketId,
      marketName: marketConfig.name,
      customerName: data.customer.name,
      customerPhone: data.customer.phone,
      customerEmail: data.customer.email || '',
      items,
      subtotal,
      tax: PREORDER_RULES.TAX_RATE,
      total,
      status: 'PENDING_CONFIRMATION',
      paymentMethod: 'PAY_AT_PICKUP',
      paymentStatus: 'PENDING',
      notes: data.notes || null,
      queuePosition: counter,
      pickupLocation: marketConfig.name,
      pickupDate: pickupDateStr,
      pickupDay: marketConfig.day,
      pickupHours: marketConfig.hours,
    });

    logger.info('Preorder persisted to MongoDB', {
      orderNumber,
      waitlistNumber,
      marketId: data.marketId,
      _id: dbOrder._id,
    });

    // Notify Square team (non-blocking)
    notifySquareTeam({
      orderNumber,
      waitlistNumber,
      customer: {
        name: data.customer.name,
        email: data.customer.email,
        phone: data.customer.phone,
      },
      items,
      pickupLocation: marketConfig.name,
      pickupDate: pickupDateStr,
      pickupHours: marketConfig.hours,
      subtotal,
      notes: data.notes || null,
    }).catch((err: any) => {
      logger.error('Failed to notify Square team', {
        error: err.message,
        orderNumber,
      });
    });

    return NextResponse.json({
      success: true,

      // Backward-compatible top-level fields for current UI
      orderNumber,
      waitlistNumber,
      waitlistPosition: counter,

      preorder: {
        orderNumber,
        waitlistNumber,
        waitlistPosition: counter,
        pickupLocation: marketConfig.name,
        pickupDate: pickupDateStr,
        pickupHours: marketConfig.hours,
        estimatedTime: getEstimatedWaitTime(counter),
      },
    });
  } catch (error: any) {
    logger.error('Preorder creation error', { error: error.message });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create preorder. Please try again.',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Get preorder status
 * GET /api/preorder?orderNumber=PRE-xxx
 * Returns real data from MongoDB — 404 if not found, NO mocks
 */
export async function GET(request: any) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber');

    if (!orderNumber) {
      return NextResponse.json(
        { success: false, error: 'Order number is required' },
        { status: 400 }
      );
    }

    logger.info('Preorder status check', { orderNumber });

    const preorder = await findPreorderByOrderNumber(orderNumber);

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
        message: getStatusMessage(preorder.status),
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
