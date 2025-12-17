import { NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/resend-email';

export async function POST(request) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const result = await sendWelcomeEmail(email, name);

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
    console.error('Send welcome email error:', error.message, { stack: error.stack });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
