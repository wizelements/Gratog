export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { RateLimit } from '@/lib/redis';
import { connectToDatabase } from '@/lib/db-optimized';
import { resolveActivePreorderMarket } from '@/lib/preorder/market-resolver';
import { nextPreorderPickup } from '@/lib/preorder/market-schedule';
import { pickupDateKey, CapacityError } from '@/lib/preorder/capacity';
import { getStorefrontCatalogSnapshot } from '@/lib/storefront-products';
import { isMarketPreorderPermitted } from '@/lib/preorder/eligibility';

/**
 * Explicit, NO-CHARGE waitlist interest. Not a confirmed preorder or capacity
 * hold, and never a substitute for a real Square payment confirmation.
 *
 * Caller must consciously opt in; updates deduplicate by market/date/email,
 * and PII is available only through the protected staff manifest.
 */
export async function POST(request: Request) {
  // A waitlist makes sense only for enabled, merchant-configured capacity.
  // Do not retain unrelated customer PII while the new system is dormant.
  if (process.env.PREORDER_CAPACITY_ENGINE_ENABLED !== 'true') {
    return NextResponse.json({ success: false, code: 'WAITLIST_NOT_ACTIVE',
      error: 'This request list is not open yet.' }, { status: 503 });
  }
  try {
    const source = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!RateLimit.check('preorder_waitlist:' + source, 10, 60)) {
      return NextResponse.json({ success: false, error: 'Please try again shortly.' }, { status: 429 });
    }
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 20_000) {
      return NextResponse.json({ success: false, error: 'Request too large.' }, { status: 413 });
    }
    const raw = await request.json();
    const customer = raw?.customer;
    if (raw?.consent !== true || customer?.optInWaitlist !== true) {
      return NextResponse.json({ success: false,
        error: 'You must opt in before joining a preorder waitlist.' }, { status: 400 });
    }
    const email = String(customer?.email || '').trim().toLowerCase();
    const name = String(customer?.name || '').trim();
    const phone = String(customer?.phone || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email.length > 254 || name.length < 2 || name.length > 120 ||
        phone.length > 40) {
      return NextResponse.json({ success: false, error: 'Valid contact information is required.' },
        { status: 400 });
    }
    const market = await resolveActivePreorderMarket(raw?.marketId);
    if (!market) {
      return NextResponse.json({ success: false, error: 'This market is not accepting requests.' }, { status: 400 });
    }
    const pickupDate = nextPreorderPickup(market);
    if (!pickupDate) {
      return NextResponse.json({ success: false, error: 'This market has no open pickup date.' }, { status: 409 });
    }
    if (!Array.isArray(raw?.items) || raw.items.length < 1 || raw.items.length > 30) {
      return NextResponse.json({ success: false, error: 'Select items for your request.' }, { status: 400 });
    }
    const catalog = await getStorefrontCatalogSnapshot({});
    const productMap = new Map<string, any>();
    for (const product of catalog.products || []) {
      if (!isMarketPreorderPermitted(product)) continue;
      for (const key of [product.id, product.slug, product.variationId]) {
        if (key) productMap.set(String(key), product);
      }
    }
    const items: Array<{ productId: string; name: string; quantity: number }> = [];
    for (const item of raw.items) {
      const product = productMap.get(String(item.id || item.productId || ''));
      const qty = Number(item.quantity);
      if (!product || !Number.isSafeInteger(qty) || qty < 1 || qty > 99) {
        return NextResponse.json({ success: false, error: 'One or more requested products are unavailable.' },
          { status: 409 });
      }
      items.push({ productId: String(product.id), name: String(product.name), quantity: qty });
    }
    const dateKey = pickupDateKey(pickupDate);
    const contactHash = createHash('sha256').update(email).digest('hex');
    const now = new Date();
    const { db } = await connectToDatabase();
    const id = JSON.stringify([market.id, dateKey, contactHash]);
    const query = { _id: id };
    await db.collection('preorder_waitlist_interests').updateOne(query, {
      $set: {
        marketId: market.id, marketName: market.name, pickupDateKey: dateKey,
        customerName: name, customerEmail: email, customerPhone: phone,
        items, status: 'waiting', consentAt: now,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now, expiresAt: new Date(now.getTime() + 90 * 86_400_000) },
    }, { upsert: true });
    return NextResponse.json({
      success: true, status: 'waitlisted', charged: false,
      message: 'You are on the request list, not a paid or confirmed preorder. We will contact you if we can prepare your items.',
    }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    if (error instanceof CapacityError) {
      return NextResponse.json({ success: false, code: error.code, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, error: 'Unable to add you to the request list.' }, { status: 503 });
  }
}
