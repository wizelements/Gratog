import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { connectToDatabase } from '@/lib/db-optimized';
import { rateLimitByIp } from '@/lib/rate-limit';
import { validateCheckoutFulfillment } from '@/lib/order-admission';
import { validateGeorgiaDestination } from '@/lib/georgia-orders';
import { approvedUnitPriceCents } from '@/lib/merchant-pricing';
import { CURRENT_MENU } from '@/lib/square-menu-stock';
import { sendOwnerAlert } from '@/lib/owner-alerts';
import { sendPreorderRequestAcknowledgement } from '@/lib/preorder/customer-acknowledgement';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const HEADERS = { 'Cache-Control': 'no-store' };
const fail = (code: string, message: string, status = 422) =>
  NextResponse.json({ success: false, code, error: message }, { status, headers: HEADERS });

function text(value: unknown, limit: number) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}
function key(value: unknown) {
  return text(value, 100).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-+$/g, '');
}
const aliases = new Map<string, (typeof CURRENT_MENU)[number]>();
for (const item of CURRENT_MENU) {
  aliases.set(key(item.slug), item);
  aliases.set(key(item.name), item);
  for (const alias of item.aliases) aliases.set(key(alias), item);
}

/**
 * Genuine, explicit preorder REQUEST, not a paid reservation.
 *
 * A paid preorder requires an approved per-batch production capacity, future
 * fulfillment confirmation and a separate payment link / checkout authority.
 * This route never creates a Square payment, changes inventory, or promises
 * an unapproved fulfillment date.
 */
export async function POST(request: NextRequest) {
  const rate = await rateLimitByIp(request, 6);
  if (!rate.ok) return fail('RATE_LIMITED', 'Too many requests. Please try later.', 429);
  let body: any;
  try {
    body = await request.json();
  } catch { return fail('INVALID_JSON', 'Invalid request.', 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return fail('INVALID_REQUEST', 'Invalid preorder request.', 400);
  }
  if (body.preorderAcknowledged !== true || body.preorderTermsVersion !== '2026-10-31' ||
    body.confirmedFulfillment !== true) {
    return fail('PREORDER_ACKNOWLEDGEMENT_REQUIRED',
      'Confirm the preorder terms and your selected fulfillment method before placing the request.');
  }
  const product = aliases.get(key(body.product));
  if (!product) return fail('PRODUCT_NOT_ON_CURRENT_MENU', 'Choose a current-menu item.');
  const count = Number(body.quantity);
  if (!Number.isSafeInteger(count) || count < 1 || count > 32) {
    return fail('INVALID_QUANTITY', 'Choose between 1 and 32 items.');
  }
  const priceCents = approvedUnitPriceCents({ name: product.name });
  if (priceCents === null || priceCents < 1) {
    return fail('PRICE_UNVERIFIED', 'This item needs a verified price.');
  }
  const name = text(body.customer?.name, 100);
  const email = text(body.customer?.email, 254).toLowerCase();
  const phone = text(body.customer?.phone, 40);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail('CONTACT_REQUIRED', 'Enter your name and a valid email.');
  }
  const fulfillmentType = text(body.fulfillmentType, 30);
  const pickup = {
    locationId: text(body.pickup?.locationId, 100),
    date: text(body.pickup?.date, 50),
  };
  const address = {
    street: text(body.address?.street, 120),
    suite: text(body.address?.suite, 90),
    city: text(body.address?.city, 80),
    state: text(body.address?.state, 12).toUpperCase(),
    zip: text(body.address?.zip, 15),
  };
  const window = text(body.deliveryTimeSlot, 100);
  const shippingMethod = text(body.shippingMethod, 50);
  const order = {
    fulfillmentType,
    pickup,
    deliveryAddress: address,
    deliveryTimeSlot: window,
    shippingAddress: address,
    shippingMethod,
  };
  const fulfillment = validateCheckoutFulfillment(order);
  if (!fulfillment.valid) return fail(fulfillment.code || 'FULFILLMENT_SELECTION_REQUIRED', fulfillment.message || 'Select complete fulfillment details.');
  if (fulfillmentType === 'shipping' || fulfillmentType === 'delivery') {
    const geo = validateGeorgiaDestination(address);
    if (!geo.valid) return fail(geo.code || 'GEORGIA_ONLY', geo.message || 'Georgia fulfillment only.');
  }
  // These are requests for a future batch, NOT evidence that scheduled
  // pickup, shipping eligibility or delivery capacity has been approved.
  const idempotencyId = text(body.requestId, 80);
  if (!/^[a-f0-9-]{36}$/i.test(idempotencyId)) {
    return fail('REQUEST_ID_REQUIRED', 'Refresh the preorder form and submit again.', 400);
  }
  const id = 'preorder_request_' +
    createHash('sha256').update(idempotencyId + ':' + email).digest('hex');
  const record = {
    _id: id,
    requestId: idempotencyId,
    productSlug: product.slug,
    productName: product.name,
    category: product.kind,
    quantity: count,
    unitPriceCents: priceCents,
    merchandiseTotalCents: priceCents * count,
    currency: 'USD',
    customer: { name, email, phone },
    fulfillmentType,
    ...(fulfillmentType.startsWith('pickup') ? { pickup } : {}),
    ...(fulfillmentType === 'delivery' ? { deliveryAddress: address, deliveryTimeSlot: window } : {}),
    ...(fulfillmentType === 'shipping' ? { shippingAddress: address, shippingMethod } : {}),
    preorderAcknowledged: true,
    preorderTermsVersion: '2026-10-31',
    confirmedFulfillment: true,
    status: 'awaiting_merchant_capacity_and_schedule_confirmation',
    paymentStatus: 'not_charged',
    capacityReserved: false,
    squarePaymentId: null,
    createdAt: new Date(),
  };
  try {
    const { db } = await connectToDatabase();
    const existing = await db.collection('preorder_requests').findOne({ _id: id });
    if (existing) {
      const same = existing.productSlug === record.productSlug &&
        existing.quantity === record.quantity &&
        existing.fulfillmentType === record.fulfillmentType &&
        JSON.stringify(existing.pickup || null) === JSON.stringify((record as any).pickup || null) &&
        JSON.stringify(existing.deliveryAddress || null) === JSON.stringify((record as any).deliveryAddress || null) &&
        JSON.stringify(existing.shippingAddress || null) === JSON.stringify((record as any).shippingAddress || null);
      if (!same) return fail('IDEMPOTENCY_CONFLICT', 'Start a new request for changed preorder details.', 409);
      return NextResponse.json({ success: true, requestId: id, status: existing.status,
        paymentStatus: 'not_charged', message: 'Your preorder request was already received. No payment was taken.' },
        { headers: HEADERS });
    }
    await db.collection('preorder_requests').insertOne(record);

    // Record contact attempt against the request. A provider acceptance is
    // not the same as inbox delivery, and MOCK is not a real message.
    let customerContactStatus: 'unavailable' | 'sent_to_provider' = 'unavailable';
    try {
      const emailAttempt = await sendPreorderRequestAcknowledgement(record);
      customerContactStatus = emailAttempt.status;
      await db.collection('preorder_requests').updateOne(
        { _id: id },
        { $set: {
          'customerContact.email.status': emailAttempt.status,
          'customerContact.email.provider': emailAttempt.provider,
          'customerContact.email.messageId': emailAttempt.status === 'sent_to_provider'
            ? emailAttempt.messageId : null,
          'customerContact.email.attemptedAt': new Date(),
          'customerContact.email.deliveryVerified': false,
        } }
      );
    } catch {
      await db.collection('preorder_requests').updateOne({ _id: id }, {
        $set: { 'customerContact.email.status': 'unavailable',
          'customerContact.email.attemptedAt': new Date() },
      }).catch(() => undefined);
    }

    // Owner notification is best effort. A failed notification cannot result
    // in falsely telling the customer their order is paid or confirmed.
    try {
      await sendOwnerAlert({
        sourceEventId: id, category: 'fresh_batch', severity: 'info',
        title: (customerContactStatus === 'unavailable'
          ? 'CUSTOMER ACKNOWLEDGEMENT NEEDS ATTENTION: '
          : 'New confirmed-method preorder request: ') + product.name,
        body: count + ' × ' + product.name + ' / ' + fulfillmentType +
          ' (requested only; no payment or capacity authorization)' +
          (customerContactStatus === 'unavailable' ? ' / automated customer email unavailable' : ''),
        actionUrl: 'https://tasteofgratitude.shop/admin/fresh-batches',
        channel: 'all', eventAt: new Date().toISOString(),
        metadata: { requestId: id, productSlug: product.slug, quantity: count, fulfillmentType },
      });
    } catch { /* Persisted request is still valid without the alert. */ }
    return NextResponse.json({
      success: true, requestId: id,
      productName: product.name,
      quantity: count,
      merchandiseTotalCents: record.merchandiseTotalCents,
      status: record.status,
      paymentStatus: 'not_charged',
      customerEmailStatus: customerContactStatus,
      message: customerContactStatus === 'sent_to_provider'
        ? 'Preorder request received. We sent your acknowledgement to our email provider, but delivery is not yet confirmed. Batch capacity, eligibility and timing are subject to merchant confirmation. No payment was taken.'
        : 'Preorder request received; automatic email acknowledgement was unavailable. Keep your request reference and contact Taste of Gratitude support if you need an immediate response. No payment was taken.',
    }, { status: 201, headers: HEADERS });
  } catch {
    return fail('PREORDER_STORAGE_UNAVAILABLE', 'Could not save your preorder request. Please try again.', 503);
  }
}
