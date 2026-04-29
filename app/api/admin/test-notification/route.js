export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-session';
import { verifyRequestAuthentication } from '@/lib/rewards-security';
import { notifyStaffPickupOrder } from '@/lib/staff-notifications';
import { sendOrderConfirmationEmail } from '@/lib/resend-email';
import { createLogger } from '@/lib/logger';

const logger = createLogger('TestNotificationAPI');

async function authenticateCaller(request) {
  // Try admin session cookie first
  const session = await getAdminSession(request);
  if (session) return { email: session.email, via: 'admin_session' };

  // Fall back to API key (ADMIN_API_KEY / MASTER_API_KEY)
  const auth = await verifyRequestAuthentication(request, { allowPublic: false });
  if (auth?.authenticated && (auth.authType === 'master_key' || auth.authType === 'admin_key')) {
    return { email: auth.userEmail || 'admin@system', via: auth.authType };
  }

  // Fall back to STAFF_NOTIFICATION_TEST_KEY (for CLI testing)
  const testKey = process.env.STAFF_NOTIFICATION_TEST_KEY;
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  if (testKey && token && token === testKey) {
    return { email: 'cli-test@system', via: 'test_key' };
  }

  return null;
}

export async function POST(request) {
  try {
    const caller = await authenticateCaller(request);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type = 'staff' } = body;

    const testOrder = {
      id: `test_${Date.now()}`,
      orderNumber: `TEST-${Date.now().toString().slice(-6)}`,
      status: 'paid',
      fulfillmentType: body.fulfillmentType || 'pickup_market',
      customer: {
        name: body.customerName || 'Solo Wat',
        email: body.customerEmail || 'silverwatkins@gmail.com',
        phone: body.customerPhone || '555-000-0000',
      },
      items: [
        {
          name: 'Test Item — Honey Jar',
          price: 12.0,
          quantity: 1,
          size: '8oz',
        },
      ],
      pricing: {
        subtotal: 12.0,
        total: 12.0,
        deliveryFee: 0,
        tax: 0,
      },
      fulfillment: { type: body.fulfillmentType || 'pickup_market' },
      deliveryAddress: body.fulfillmentType === 'delivery'
        ? { street: '123 Test St', city: 'Atlanta', state: 'GA', zip: '30301' }
        : undefined,
      createdAt: new Date().toISOString(),
    };

    logger.info('Sending test notification', {
      type,
      callerEmail: caller.email,
      callerVia: caller.via,
      fulfillmentType: testOrder.fulfillmentType,
    });

    const results = {};

    if (type === 'staff' || type === 'all') {
      const staffResult = await notifyStaffPickupOrder(testOrder);
      results.staff = staffResult;
    }

    if (type === 'customer' || type === 'all') {
      const emailResult = await sendOrderConfirmationEmail({
        id: testOrder.id,
        orderNumber: testOrder.orderNumber,
        customer: testOrder.customer,
        items: testOrder.items,
        pricing: testOrder.pricing,
        fulfillment: testOrder.fulfillment,
        payment: {
          receiptUrl: null,
          cardBrand: 'VISA',
          cardLast4: '0000',
        },
      });
      results.customer = emailResult;
    }

    return NextResponse.json({
      success: true,
      message: `Test ${type} notification(s) sent`,
      results,
      testOrder: {
        orderNumber: testOrder.orderNumber,
        fulfillmentType: testOrder.fulfillmentType,
        customerEmail: testOrder.customer.email,
      },
    });
  } catch (error) {
    logger.error('Test notification failed', { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
