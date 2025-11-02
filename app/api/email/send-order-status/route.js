import { NextResponse } from 'next/server';
import { sendOrderStatusEmail } from '@/lib/resend-email';

export async function POST(request) {
  try {
    const { order, status } = await request.json();

    if (!order || !status) {
      return NextResponse.json(
        { error: 'Order and status are required' },
        { status: 400 }
      );
    }

    const result = await sendOrderStatusEmail(order, status);

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
    console.error('Send order status email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
