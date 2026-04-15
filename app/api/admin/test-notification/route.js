import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { notifyStaffPickupOrder } from '@/lib/staff-notifications';
import { sendOrderConfirmationEmail } from '@/lib/resend-email';
import { createLogger } from '@/lib/logger';

const logger = createLogger('TestNotificationAPI');

export async function POST(request) {
  try {
    const admin = await requireAdmin(request);

    const body = await request.json();
    const { type = 'staff' } = body;

    const testOrder = {
      id: `test_${Date.now()}`,
      orderNumber: `TEST-${Date.now().toString().slice(-6)}`,
      status: 'paid',
      fulfillmentType: body.fulfillmentType || 'pickup_market',
      customer: {
        name: body.customerName || 'Test Customer',
        email: body.customerEmail || admin.email,
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
      adminEmail: admin.email,
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

    if (error.name === 'AdminAuthError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
