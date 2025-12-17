import { NextResponse } from 'next/server';
import { sendOrderConfirmationEmail } from '@/lib/resend-email';

export async function POST(request) {
  try {
    const order = await request.json();

    if (!order || !order.customer || !order.customer.email) {
      return NextResponse.json(
        { error: 'Invalid order data' },
        { status: 400 }
      );
    }

    const result = await sendOrderConfirmationEmail(order);

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        provider: result.provider
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Send order confirmation email error:', error.message, { stack: error.stack });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
