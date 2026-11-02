export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { earnFromPurchase } from '@/lib/gratitude/transactions';
import { verifySquareWebhookSignature } from '@/lib/batches/square-webhook-auth';
import { getIsolatedPreviewWebhookKey } from '@/lib/preview-square-webhook-key';

export const runtime = 'nodejs';

/**
 * POST /api/gratitude/webhook
 * Handle Square payment webhooks for auto-earning credits
 * 
 * This is called by Square when a payment is completed
 */
export async function POST(request: NextRequest) {
  try {
    // Square signs the PUBLIC notification URL followed by the exact raw body.
    // Never reconstruct JSON, accept the legacy x-square-signature header,
    // or skip signature verification due to absent credentials.
    const rawBody = await request.text();
    if (rawBody.length > 256000) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
    const signature = request.headers.get('x-square-hmacsha256-signature');
    const signingUrl = process.env.SQUARE_GRATITUDE_WEBHOOK_URL || request.url;
    const configuredKey = process.env.SQUARE_GRATITUDE_WEBHOOK_SIGNATURE_KEY ||
      process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    const previewSandbox = process.env.VERCEL_ENV === 'preview' &&
      process.env.SQUARE_ENVIRONMENT === 'sandbox';
    const isolatedKey = previewSandbox ? await getIsolatedPreviewWebhookKey(signingUrl) : null;
    const verified = previewSandbox
      ? Boolean(isolatedKey) && verifySquareWebhookSignature(signature, rawBody, signingUrl, isolatedKey!)
      : verifySquareWebhookSignature(signature, rawBody, signingUrl, configuredKey);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    let body: any;
    try { body = JSON.parse(rawBody); }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const { type, data } = body;
    
    // Only process payment.completed events
    if (type !== 'payment.created' && type !== 'payment.updated') {
      return NextResponse.json({ received: true, processed: false });
    }
    
    const payment = data?.object?.payment || data?.payment;
    if (!payment) {
      return NextResponse.json({ received: true, processed: false });
    }
    
    // Only process completed payments
    if (payment.status !== 'COMPLETED') {
      return NextResponse.json({ received: true, processed: false });
    }
    
    await connectToDatabase();
    
    // Extract order info from payment
    const orderId = payment.order_id || payment.reference_id;
    const amount = payment.amount_money?.amount || 0; // in cents
    const customerId = payment.customer_id;
    
    // Check if we have a customer record for this payment
    // This requires linking Square customer to our customer DB
    const { db } = await connectToDatabase();
    const customer = await db.collection('customers').findOne({
      $or: [
        { squareCustomerId: customerId },
        { 'payments.paymentId': payment.id }
      ]
    });
    
    if (!customer?._id) {
      // No linked customer, can't award credits
      return NextResponse.json({ 
        received: true, 
        processed: false,
        reason: 'No linked customer found'
      });
    }
    
    // Get customer tier
    const { getAccount } = await import('@/lib/gratitude/accounts');
    const account = await getAccount(customer._id);
    // @ts-ignore — type fix needed
    const tier = account?.tier?.current || 'seedling';
    
    // Check if this is first purchase
    const { getTransactionHistory } = await import('@/lib/gratitude/transactions');
    const history = await getTransactionHistory(customer._id, { type: 'earn', limit: 1 });
    const isFirstPurchase = history.length === 0 || 
      !history.some((t: any) => t.source?.type === 'purchase');
    
    // Award credits
    const result = await earnFromPurchase({
      customerId: customer._id,
      orderId,
      orderTotal: amount,
      tier,
      isFirstPurchase,
      isPreorder: false, // TODO: Detect from order metadata
      metadata: {
        paymentId: payment.id,
        squareOrderId: orderId
      }
    });
    
    return NextResponse.json({
      received: true,
      // @ts-ignore — type fix needed
      processed: result.success,
      // @ts-ignore — type fix needed
      credits: result.credits,
      // @ts-ignore — type fix needed
      tierUpgrade: result.tierUpgrade || null
    });
    
  } catch (error) {
    console.error('Gratitude webhook error:', error);
    // A failed reconciliation is NOT successful delivery. Allow Square to retry.
    return NextResponse.json({ error: 'Webhook reconciliation failed' }, { status: 503 });
  }
}
