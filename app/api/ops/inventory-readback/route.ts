import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TARGETS = new Set(['pineapple basil', 'pineapple mango', 'strawberry bliss']);

async function square(path: string, init?: RequestInit) {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) throw new Error('Square unavailable');
  const base = process.env.SQUARE_ENVIRONMENT === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
  const response = await fetch(base + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Square-Version': '2026-09-16',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  const body = await response.json();
  if (!response.ok) throw new Error('Square request failed');
  return body;
}

export async function GET() {
  if (process.env.VERCEL_ENV !== 'production' || process.env.SQUARE_ENVIRONMENT !== 'production') {
    return NextResponse.json({ error: 'Production only' }, { status: 403 });
  }
  try {
    const locationId = process.env.SQUARE_LOCATION_ID;
    if (!locationId) throw new Error('Square location unavailable');

    const catalog = await square('/v2/catalog/list?types=ITEM');
    const matches: Array<{ product: string; variationId: string }> = [];
    for (const obj of catalog.objects || []) {
      const name = String(obj?.item_data?.name || '').trim().toLowerCase();
      if (!TARGETS.has(name)) continue;
      const variations = obj?.item_data?.variations || [];
      if (variations.length !== 1) {
        return NextResponse.json({ error: 'Ambiguous catalog variation', product: obj?.item_data?.name }, { status: 409 });
      }
      matches.push({ product: obj.item_data.name, variationId: variations[0].id });
    }
    const missing = [...TARGETS].filter(t => !matches.some(m => m.product.trim().toLowerCase() === t));
    if (missing.length) return NextResponse.json({ error: 'Catalog targets missing', missing }, { status: 409 });

    const verify = await square('/v2/inventory/counts/batch-retrieve', {
      method: 'POST',
      body: JSON.stringify({
        catalog_object_ids: matches.map(x => x.variationId),
        location_ids: [locationId],
        states: ['IN_STOCK'],
      }),
    });
    const counts = new Map<string, number>((verify.counts || []).map((c: any): [string, number] => [String(c.catalog_object_id), Number(c.quantity)]));
    return NextResponse.json({
      source: 'square',
      asOf: new Date().toISOString(),
      inventory: matches.map(x => ({ product: x.product, count: counts.get(x.variationId) ?? 0 })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Inventory read failed' }, { status: 502 });
  }
}
