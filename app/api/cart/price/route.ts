export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { priceCart, CartPricingError } from '@/lib/cart-pricing';

/**
 * Read-only price preview. Uses the same authoritative Mongo catalog pricing
 * as /api/orders/create rather than a second Square-only pricing/tax formula.
 * Shipping, delivery, coupon, and final tax rules belong to the order quote.
 */
export async function POST(request: NextRequest) {
  let body: { lines?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON request.' }, { status: 400 });
  }

  const lines = body?.lines;
  if (!Array.isArray(lines) || lines.length === 0 || lines.length > 50) {
    return NextResponse.json({ success: false, error: 'Provide between 1 and 50 cart lines.' }, { status: 400 });
  }

  const valid = lines.every((line) =>
    line &&
    typeof line.variationId === 'string' &&
    line.variationId.length > 0 &&
    line.variationId.length <= 128 &&
    Number.isInteger(line.qty) &&
    line.qty > 0 &&
    line.qty <= 50
  );

  if (!valid) {
    return NextResponse.json(
      { success: false, error: 'Every cart line must have a valid variation ID and quantity from 1 to 50.' },
      { status: 400 }
    );
  }

  try {
    const priced = await priceCart({
      items: lines.map((line) => ({
        variationId: line.variationId,
        quantity: line.qty,
      })),
    });

    return NextResponse.json({
      success: true,
      pricing: {
        subtotalCents: priced.subtotalCents,
        taxCents: priced.taxCents,
        totalCents: priced.totalCents,
        currency: priced.currency,
      },
      lines: priced.items.map((item) => ({
        variationId: item.variationId,
        name: item.name,
        qty: item.quantity,
        pricePerItemCents: item.unitPriceCents,
        lineTotalCents: item.lineTotalCents,
      })),
      message: 'Prices verified against the current checkout catalog.',
    });
  } catch (error) {
    if (error instanceof CartPricingError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error('[Cart Price Preview] Error', error);
    return NextResponse.json(
      { success: false, error: 'Unable to verify cart prices. Please try again.' },
      { status: 503 }
    );
  }
}
