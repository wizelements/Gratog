import { NextRequest, NextResponse } from 'next/server';
import { resolveLabelProduct } from '@/lib/label-commerce';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Old printed labels still post here. A label is a discovery link, never an
 * independent payment authority: canonical checkout must admit the order,
 * reserve stock and verify fulfillment before any Square capture.
 */
export async function POST(request: NextRequest) {
  let slug = '';
  try {
    const form = await request.formData();
    const value = form.get('slug');
    if (typeof value === 'string' && value.length <= 120) slug = value;
  } catch {
    // Malformed legacy posts have no financial side effect.
  }
  const resolved = slug ? await resolveLabelProduct(slug) : null;
  // productPath comes from a catalog identity, never a supplied return URL,
  // market, price, quantity, or success claim from the browser.
  const destination = new URL(resolved?.productPath || '/catalog', request.url);
  destination.searchParams.set('source', 'label');
  return NextResponse.redirect(destination, {
    status: 303,
    headers: { 'Cache-Control': 'no-store' },
  });
}
