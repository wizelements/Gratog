import { NextResponse } from 'next/server';
import stripe from '@/lib/stripe';

export async function GET(request, { params }) {
  try {
    const { sessionId } = params;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session ID' },
        { status: 400 }
      );
    }
    
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    return NextResponse.json({
      status: session.status,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
      customer_details: session.customer_details,
      metadata: session.metadata,
    });
  } catch (error) {
    console.error('Payment status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve payment status' },
      { status: 500 }
    );
  }
}
