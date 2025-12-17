import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db-optimized';
import {
  orderConfirmationTemplate,
  shippingNotificationTemplate,
  pickupReminderTemplate,
  deliveryNotificationTemplate,
  passwordResetTemplate,
  welcomeTemplate,
  reviewRequestTemplate,
} from '@/lib/email-templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Sample data for previews when no real data is available
const sampleOrder = {
  id: 'ord_abc123def456',
  orderNumber: 'TOG-2024-001234',
  customerName: 'Jane Smith',
  customer: { name: 'Jane Smith', email: 'jane@example.com' },
  createdAt: new Date().toISOString(),
  fulfillmentType: 'delivery',
  shippingAddress: '123 Wellness Way, Charlotte, NC 28202',
  pickupLocation: 'Matthews Farmers Market, 188 N Trade St, Matthews, NC',
  pickupDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  items: [
    { name: 'Sea Moss Gel - Mango', variation: '16 oz', quantity: 2, price: 3500 },
    { name: 'Sea Moss Gel - Original', variation: '8 oz', quantity: 1, price: 2000 },
    { name: 'Elderberry Wellness Shot', variation: '2 oz', quantity: 3, price: 1500 },
  ],
  subtotal: 12500,
  tax: 875,
  shippingCost: 599,
  discount: 1000,
  total: 12974,
};

const sampleTracking = {
  number: '9400111899223456789012',
  carrier: 'USPS',
  url: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223456789012',
};

/**
 * GET /api/admin/email-preview
 * Preview email templates (admin only)
 * 
 * Query params:
 * - template: orderConfirmation | shipping | pickup | delivery | passwordReset | welcome | reviewRequest
 * - orderId: (optional) real order ID to use
 */
export async function GET(request) {
  const token = request.cookies.get('admin_token')?.value;
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const template = searchParams.get('template') || 'orderConfirmation';
  const orderId = searchParams.get('orderId');

  let order = sampleOrder;

  // If orderId provided, fetch real order data
  if (orderId) {
    try {
      const { db } = await connectToDatabase();
      const realOrder = await db.collection('orders').findOne({ 
        $or: [
          { _id: orderId },
          { orderId: orderId },
          { orderNumber: orderId }
        ]
      });
      
      if (realOrder) {
        order = {
          ...realOrder,
          id: realOrder._id?.toString() || realOrder.orderId,
          orderNumber: realOrder.orderNumber || realOrder.orderId?.slice(-8).toUpperCase(),
        };
      }
    } catch (error) {
      console.error('Failed to fetch order for preview:', error);
    }
  }

  let html = '';
  let templateName = '';

  try {
    switch (template) {
      case 'orderConfirmation':
        templateName = 'Order Confirmation';
        html = orderConfirmationTemplate(order);
        break;

      case 'shipping':
        templateName = 'Shipping Notification';
        html = shippingNotificationTemplate(order, sampleTracking);
        break;

      case 'pickup':
        templateName = 'Pickup Reminder';
        order.fulfillmentType = 'pickup';
        html = pickupReminderTemplate(
          order, 
          order.pickupLocation, 
          order.pickupDate
        );
        break;

      case 'delivery':
        templateName = 'Delivery Notification';
        html = deliveryNotificationTemplate(order, 'Today between 2-4 PM');
        break;

      case 'passwordReset':
        templateName = 'Password Reset';
        html = passwordResetTemplate(
          order.customerName || 'Customer',
          'https://tasteofgratitude.com/reset-password?token=sample_reset_token_abc123'
        );
        break;

      case 'welcome':
        templateName = 'Welcome Email';
        html = welcomeTemplate(order.customerName || 'Wellness Seeker');
        break;

      case 'reviewRequest':
        templateName = 'Review Request';
        html = reviewRequestTemplate(order, order.items);
        break;

      default:
        return NextResponse.json(
          { 
            error: 'Invalid template name',
            availableTemplates: [
              'orderConfirmation',
              'shipping', 
              'pickup',
              'delivery',
              'passwordReset',
              'welcome',
              'reviewRequest'
            ]
          },
          { status: 400 }
        );
    }

    // Return HTML directly for preview
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Template-Name': templateName,
      },
    });

  } catch (error) {
    console.error('Email template rendering error:', error);
    return NextResponse.json(
      { error: 'Failed to render template', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/email-preview/list
 * List available templates
 */
export async function POST(request) {
  const token = request.cookies.get('admin_token')?.value;
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    templates: [
      { id: 'orderConfirmation', name: 'Order Confirmation', description: 'Sent when order is placed' },
      { id: 'shipping', name: 'Shipping Notification', description: 'Sent when order ships' },
      { id: 'pickup', name: 'Pickup Reminder', description: 'Reminder before market pickup' },
      { id: 'delivery', name: 'Delivery Notification', description: 'Sent when out for delivery' },
      { id: 'passwordReset', name: 'Password Reset', description: 'Password reset request' },
      { id: 'welcome', name: 'Welcome Email', description: 'Sent to new members' },
      { id: 'reviewRequest', name: 'Review Request', description: 'Request product reviews' },
    ],
    previewUrl: '/api/admin/email-preview?template={templateId}',
  });
}
