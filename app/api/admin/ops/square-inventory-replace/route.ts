import { randomUUID, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TARGETS = new Map([
  ['pineapple basil', 35],
  ['pineapple mango', 20],
  ['strawberry bliss', 16],
]);

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

function baseUrl() {
  return (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase() === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

function squareHeaders(extra?: HeadersInit) {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) throw new Error('SQUARE_ACCESS_TOKEN missing');

  const headers = new Headers(extra);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');
  headers.set('Square-Version', '2025-10-16');
  return headers;
}

async function square(path: string, init?: RequestInit) {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: squareHeaders(init?.headers),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data?.errors || data));
  return data;
}

export async function POST(req: NextRequest) {
  const supplied = req.headers.get('x-admin-api-token') || '';
  const expected = process.env.ADMIN_API_TOKEN || '';
  if (!supplied || !expected || !safeEqual(supplied, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) return NextResponse.json({ error: 'SQUARE_LOCATION_ID missing' }, { status: 500 });

  const catalog = await square('/v2/catalog/list?types=ITEM');
  const matches: Array<{ product: string; itemId: string; variationId: string; quantity: number }> = [];

  for (const obj of catalog.objects || []) {
    const name = String(obj?.item_data?.name || '').trim().toLowerCase();
    if (!TARGETS.has(name)) continue;
    const variations = obj?.item_data?.variations || [];
    if (variations.length !== 1) {
      return NextResponse.json({ error: 'Ambiguous variation count', product: obj.item_data.name, variations: variations.map((v: any) => ({ id: v.id, name: v?.item_variation_data?.name })) }, { status: 409 });
    }
    matches.push({ product: obj.item_data.name, itemId: obj.id, variationId: variations[0].id, quantity: TARGETS.get(name)! });
  }

  if (matches.length !== TARGETS.size) {
    return NextResponse.json({ error: 'Not all target products matched exactly', matched: matches.map(x => x.product), expected: [...TARGETS.keys()] }, { status: 409 });
  }

  const occurredAt = new Date().toISOString();
  const changes = matches.map(x => ({
    type: 'PHYSICAL_COUNT',
    physical_count: {
      catalog_object_id: x.variationId,
      location_id: locationId,
      state: 'IN_STOCK',
      quantity: String(x.quantity),
      occurred_at: occurredAt,
    },
  }));

  await square('/v2/inventory/changes/batch-create', {
    method: 'POST',
    body: JSON.stringify({ idempotency_key: randomUUID(), changes, ignore_unchanged_counts: true }),
  });

  const verify = await square('/v2/inventory/counts/batch-retrieve', {
    method: 'POST',
    body: JSON.stringify({ catalog_object_ids: matches.map(x => x.variationId), location_ids: [locationId], states: ['IN_STOCK'] }),
  });

  const counts = new Map((verify.counts || []).map((c: any) => [c.catalog_object_id, Number(c.quantity)]));
  const result = matches.map(x => ({ product: x.product, expected: x.quantity, actual: counts.get(x.variationId) ?? null, verified: counts.get(x.variationId) === x.quantity }));
  const ok = result.every(x => x.verified);
  return NextResponse.json({ success: ok, locationId, total: result.reduce((n, x) => n + (x.actual || 0), 0), result }, { status: ok ? 200 : 409 });
}
