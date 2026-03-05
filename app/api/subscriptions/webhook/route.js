import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { getSquareWebhookSignatureKey } from '@/lib/square';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { getNextRetryDate } from '@/lib/subscription-tiers';
import crypto from 'crypto';

function verifySignature(signatureHeader, body, url) {
  try {
    const signatureKey = getSquareWebhookSignatureKey();
    const payload = url + body;
    const expectedSignature = crypto
      .createHmac('sha256', signatureKey)
      .update(payload)
      .digest('base64');
    return signatureHeader === expectedSignature;
  } catch {
    return false;
  }
}

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get('x-square-hmacsha256-signature');
    const requestUrl = request.url;

    if (!verifySignature(signatureHeader, rawBody, requestUrl)) {
      logger.error('Subscriptions', 'Webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.type;
    const { db } = await connectToDatabase();

    logger.info('Subscriptions', 'Webhook received', { type: eventType });

    switch (eventType) {
      case 'subscription.created': {
        const subData = event.data?.object?.subscription;
        if (subData) {
          await db.collection('subscription_events').insertOne({
            type: 'created',
            squareSubscriptionId: subData.id,
            customerId: subData.customer_id,
            planId: subData.plan_variation_id,
            status: subData.status,
            receivedAt: new Date(),
          });
        }
        break;
      }

      case 'subscription.updated': {
        const subData = event.data?.object?.subscription;
        if (subData) {
          await db.collection('subscriptions').updateOne(
            { squareSubscriptionId: subData.id },
            {
              $set: {
                squareStatus: subData.status,
                updatedAt: new Date(),
              },
            }
          );
        }
        break;
      }

      case 'invoice.payment_made': {
        const invoice = event.data?.object?.invoice;
        if (invoice?.subscription_id) {
          const subscription = await db.collection('subscriptions').findOne({
            squareSubscriptionId: invoice.subscription_id,
          });

          if (subscription) {
            const nextChargeDate = new Date();
            nextChargeDate.setDate(nextChargeDate.getDate() + 30);

            await db.collection('subscription_payments').insertOne({
              subscriptionId: subscription._id.toString(),
              squareInvoiceId: invoice.id,
              amount: Number(invoice.payment_requests?.[0]?.computed_amount_money?.amount || 0) / 100,
              currency: 'USD',
              status: 'paid',
              createdAt: new Date(),
            });

            await db.collection('subscriptions').updateOne(
              { _id: subscription._id },
              {
                $set: {
                  nextChargeDate,
                  'paymentRetry.attemptCount': 0,
                  'paymentRetry.nextRetryAt': null,
                  preRenewalEmailSent: false,
                  updatedAt: new Date(),
                },
              }
            );
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data?.object?.invoice;
        if (invoice?.subscription_id) {
          const subscription = await db.collection('subscriptions').findOne({
            squareSubscriptionId: invoice.subscription_id,
          });

          if (subscription) {
            const attemptCount = (subscription.paymentRetry?.attemptCount || 0) + 1;

            if (attemptCount >= 4) {
              // Final failure - cancel subscription
              await db.collection('subscriptions').updateOne(
                { _id: subscription._id },
                {
                  $set: {
                    status: 'canceled',
                    canceledAt: new Date(),
                    cancelReason: 'payment_failed_final',
                    'paymentRetry.attemptCount': attemptCount,
                    'paymentRetry.nextRetryAt': null,
                    updatedAt: new Date(),
                  },
                }
              );

              await sendEmail({
                to: subscription.email,
                subject: `❌ Your ${subscription.planName} Subscription Has Been Canceled`,
                html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                  <h2>Subscription Canceled</h2>
                  <div style="background:#fee2e2;border-left:4px solid #ef4444;padding:15px;margin:20px 0;">
                    <strong>❌ Your ${subscription.planName} subscription has been canceled</strong>
                    <p>After 4 payment retry attempts, your subscription was automatically canceled.</p>
                  </div>
                  <p><a href="https://tasteofgratitude.shop/account" style="background:#059669;color:white;padding:12px 24px;border-radius:4px;text-decoration:none;display:inline-block;">Manage My Account</a></p>
                </div>`,
              });
            } else {
              const nextRetryDate = getNextRetryDate(attemptCount + 1);

              await db.collection('subscriptions').updateOne(
                { _id: subscription._id },
                {
                  $set: {
                    status: 'payment_failed',
                    'paymentRetry.attemptCount': attemptCount,
                    'paymentRetry.lastAttempt': new Date(),
                    'paymentRetry.nextRetryAt': nextRetryDate,
                    updatedAt: new Date(),
                  },
                }
              );

              await sendEmail({
                to: subscription.email,
                subject: `We couldn't process your payment (Attempt ${attemptCount}/4)`,
                html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                  <h2>Payment Issue - ${subscription.planName}</h2>
                  <div style="background:#fee2e2;border-left:4px solid #ef4444;padding:15px;margin:20px 0;">
                    <strong>⚠️ Payment Failed (Attempt ${attemptCount} of 4)</strong>
                    <p>We couldn't charge your card for your ${subscription.planName} subscription.</p>
                  </div>
                  <p><a href="https://tasteofgratitude.shop/account/subscriptions/${subscription._id}" style="background:#059669;color:white;padding:12px 24px;border-radius:4px;text-decoration:none;display:inline-block;">Update Payment Method</a></p>
                </div>`,
              });
            }
          }
        }
        break;
      }

      default:
        logger.info('Subscriptions', 'Unhandled webhook event', { type: eventType });
    }

    return NextResponse.json({ success: true, received: eventType });
  } catch (error) {
    logger.error('Subscriptions', 'Webhook processing failed', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
