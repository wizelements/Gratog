export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { getSquareClient } from '@/lib/square';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import {
  SUBSCRIPTION_TIERS,
  validateCreatePayload,
  sanitizeString,
} from '@/lib/subscription-tiers';
import { RateLimit } from '@/lib/redis';
import { generateSubscriptionAccessToken } from '@/lib/subscription-access';
import { SITE_URL } from '@/lib/site-config';

export async function POST(request) {
  try {
    if (process.env.FEATURE_SUBSCRIPTIONS_ENABLED !== 'true') {
      return NextResponse.json({ error: 'Subscriptions are temporarily unavailable' }, { status: 503 });
    }

    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!RateLimit.check(`subscription_create:${clientIp}`, 10, 60 * 60)) {
      return NextResponse.json({ error: 'Too many subscription attempts. Please try later.' }, { status: 429 });
    }

    const body = await request.json();
    const {
      customerId,
      cardNonce,
      planId,
      options = {},
    } = body;

    const customerEmail = sanitizeString(body.customerEmail, { toLower: true });
    const customerPhone = sanitizeString(body.customerPhone);
    const firstName = sanitizeString(body.firstName) || 'Friend';

    const validation = validateCreatePayload({ planId, customerEmail, customerPhone });
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: validation.errors },
        { status: 400 }
      );
    }

    if (!cardNonce) {
      return NextResponse.json(
        { error: 'A valid payment method is required to create a subscription' },
        { status: 400 }
      );
    }

    const tier = SUBSCRIPTION_TIERS[planId];
    const client = getSquareClient();

    // Create or retrieve Square customer
    let squareCustomerId = customerId;
    if (!squareCustomerId) {
      const customerResponse = await client.customers.create({
        emailAddress: customerEmail,
        phoneNumber: customerPhone,
        givenName: firstName,
        referenceId: `gratog_${Date.now()}`,
      });
      squareCustomerId = customerResponse.result.customer.id;
    }

    // Add payment method if provided
    if (cardNonce) {
      await client.customers.createCard(squareCustomerId, {
        cardNonce,
        billingAddress: {
          addressLine1: sanitizeString(body.address),
          locality: sanitizeString(body.city),
          administrativeDistrictLevel1: sanitizeString(body.state),
          postalCode: sanitizeString(body.zipCode),
          countryCode: 'US',
        },
      });
    }

    // Create subscription in Square
    const startDate = new Date().toISOString().split('T')[0];
    const subscriptionResponse = await client.subscriptions.create({
      customerId: squareCustomerId,
      planVariationId: tier.squarePlanId,
      startDate,
      timezone: 'America/New_York',
      phases: [{
        ordinal: 0,
        periods: null,
        recurringPriceMoney: {
          amount: BigInt(tier.price),
          currency: 'USD',
        },
      }],
    });

    const squareSubscriptionId = subscriptionResponse.result.subscription.id;
    const nextChargeDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Save to MongoDB
    const { db } = await connectToDatabase();
    const subscription = {
      squareSubscriptionId,
      squareCustomerId,
      email: customerEmail,
      phone: customerPhone,
      firstName,
      planId,
      planName: tier.name,
      monthlyPrice: tier.price / 100,
      status: 'active',
      subscribedAt: new Date(),
      nextChargeDate,
      options,
      paymentRetry: { lastAttempt: null, attemptCount: 0, nextRetryAt: null },
      metadata: {
        retailValue: tier.retailValue / 100,
        discount: `${(tier.discount * 100).toFixed(0)}%`,
        cohort: 'p1_launch',
      },
      preRenewalEmailSent: false,
      winbackSent: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('subscriptions').insertOne(subscription);
    const subscriptionId = result.insertedId.toString();
    const accessToken = generateSubscriptionAccessToken({ email: customerEmail, subscriptionId });
    const manageUrl = `${SITE_URL}/account/subscriptions/${subscriptionId}?token=${encodeURIComponent(accessToken)}`;

    // Send welcome email
    await sendEmail({
      to: customerEmail,
      subject: `Welcome to ${tier.name}! Your wellness routine starts now ✨`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#059669,#10b981);color:white;padding:30px;text-align:center;border-radius:8px 8px 0 0;">
          <h1>Welcome to ${tier.name}</h1>
          <p>Your daily wellness ritual starts today</p>
        </div>
        <div style="background:#f9fafb;padding:30px;border-radius:0 0 8px 8px;">
          <p>Hi ${firstName},</p>
          <p>Thank you for starting your ${tier.name} subscription!</p>
          <h3>Your Subscription Details</h3>
          <ul>
            <li><strong>Plan:</strong> ${tier.name}</li>
            <li><strong>Monthly Cost:</strong> $${subscription.monthlyPrice.toFixed(2)}</li>
            <li><strong>Next Charge:</strong> ${nextChargeDate.toLocaleDateString()}</li>
          </ul>
          <h3>Your Benefits</h3>
          ${tier.benefits.map(b => `<p style="background:white;padding:10px;margin:5px 0;border-left:4px solid #059669;">✓ ${b}</p>`).join('')}
          <p><a href="${manageUrl}" style="background:#059669;color:white;padding:12px 24px;border-radius:4px;text-decoration:none;display:inline-block;margin-top:20px;">Manage Subscription</a></p>
          <p>With gratitude,<br>The Taste of Gratitude Team 🌿</p>
        </div>
      </div>`,
    });

    logger.info('Subscriptions', 'Created subscription', { planId, email: customerEmail });

    return NextResponse.json({
      success: true,
      subscription: {
        id: result.insertedId.toString(),
        planName: tier.name,
        monthlyPrice: subscription.monthlyPrice,
        status: 'active',
        nextChargeDate,
        createdAt: subscription.subscribedAt,
        options,
      },
    });
  } catch (error) {
    logger.error('Subscriptions', 'Failed to create subscription', error);
    return NextResponse.json(
      { error: 'Failed to create subscription', details: error.message },
      { status: 500 }
    );
  }
}
