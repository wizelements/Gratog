export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const { email, firstName } = await request.json();

    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return NextResponse.json({ success: false, error: 'Valid email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const { db } = await connectToDatabase();
    const collection = db.collection('newsletter_subscribers');

    // Rate limit: skip re-insert if subscribed in last 24h
    const recent = await collection.findOne({
      email: normalizedEmail,
      subscribedAt: { $gte: new Date(Date.now() - DAY_MS) },
    });

    if (recent) {
      return NextResponse.json({ success: true, message: 'Subscribed!' });
    }

    await collection.updateOne(
      { email: normalizedEmail },
      {
        $set: {
          email: normalizedEmail,
          firstName: firstName?.trim() || null,
          subscribedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    // Optional Resend integration
    if (process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/audiences', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: normalizedEmail, first_name: firstName?.trim() || undefined }),
        });
      } catch (resendError) {
        console.error('Resend audience sync failed (non-fatal):', resendError);
      }
    }

    return NextResponse.json({ success: true, message: 'Subscribed!' });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    return NextResponse.json({ success: false, error: 'Subscription failed' }, { status: 500 });
  }
}
