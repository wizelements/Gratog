import { NextResponse } from 'next/server';
import { sendCouponEmail } from '@/lib/resend-email';

export async function POST(request) {
  try {
    const { email, coupon } = await request.json();

    if (!email || !coupon) {
      return NextResponse.json(
        { error: 'Email and coupon data are required' },
        { status: 400 }
      );
    }

    const result = await sendCouponEmail(email, coupon);

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
    console.error('Send coupon email error:', error.message, { stack: error.stack });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
