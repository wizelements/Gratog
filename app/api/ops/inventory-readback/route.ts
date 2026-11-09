import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const API_VERSION = '2026-09-16';
const TARGETS = new Map<string, string>([
  ['pineapple basil', 'Pineapple Basil'],
  ['pineapple mango lemonade', 'Pineapple Mango Lemonade'],
  ['strawberry bliss', 'Strawberry Bliss'],
]);
const MAX_PAGES = 40;
const MAX_ITEMS_PER_BATCH = 1000;

type CatalogVariation = {
  id: string;
  name: string;
  trackingEnabled: boolean | null;
};
type CatalogMatch = {
  product: string;
  variations: CatalogVariation[];
};

function normalizedName(value: unknown): string {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

async function square(path: string, init?: RequestInit): Promise<any> {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) throw new Error('Square unavailable');
  const base = process.env.SQUARE_ENVIRONMENT === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
  const response = await fetch(base + path, {
    ...init,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Square-Version': API_VERSION,
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Square request failed');
  return response.json();
}

async function catalogItems(): Promise<any[]> {
  const items: any[] = [];
  let cursor: string | undefined;
  const seen = new Set<string>();

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const query = '/v2/catalog/list?types=ITEM' +
      (cursor ? '&cursor=' + encodeURIComponent(cursor) : '');
    const result = await square(query);
    items.push(...(result.objects || []));
    if (!result.cursor) return items;
    if (seen.has(result.cursor)) throw new Error('Square catalog pagination loop');
    seen.add(result.cursor);
    cursor = result.cursor;
  }
  throw new Error('Square catalog pagination exceeded');
}

async function stockCounts(variationIds: string[], locationId: string): Promise<Map<string, { quantity: number; calculatedAt: string | null }>> {
  const result = new Map<string, { quantity: number; calculatedAt: string | null }>();

  for (let offset = 0; offset < variationIds.length; offset += MAX_ITEMS_PER_BATCH) {
    const ids = variationIds.slice(offset, offset + MAX_ITEMS_PER_BATCH);
    let cursor: string | undefined;
    const seen = new Set<string>();

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const body = {
        catalog_object_ids: ids,
        location_ids: [locationId],
        states: ['IN_STOCK'],
        limit: 1000,
        ...(cursor ? { cursor } : {}),
      };
      const response = await square('/v2/inventory/counts/batch-retrieve', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      for (const entry of response.counts || []) {
        // Do not use amounts from another location or an unrelated inventory state.
        if (entry.location_id !== locationId || entry.state !== 'IN_STOCK') continue;
        if (!ids.includes(entry.catalog_object_id)) continue;
        const value = Number(entry.quantity);
        if (!Number.isFinite(value) || value < 0) throw new Error('Invalid Square quantity');
        const previous = result.get(entry.catalog_object_id);
        // A variation+location+state has one current count; tolerate duplicate rows by taking the newest.
        if (!previous || String(entry.calculated_at || '') >= String(previous.calculatedAt || '')) {
          result.set(entry.catalog_object_id, {
            quantity: value,
            calculatedAt: entry.calculated_at || null,
          });
        }
      }
      if (!response.cursor) break;
      if (seen.has(response.cursor)) throw new Error('Square inventory pagination loop');
      seen.add(response.cursor);
      cursor = response.cursor;
      if (page === MAX_PAGES - 1) throw new Error('Square inventory pagination exceeded');
    }
  }
  return result;
}

export async function GET() {
  if (process.env.VERCEL_ENV !== 'production' || process.env.SQUARE_ENVIRONMENT !== 'production') {
    return NextResponse.json({ error: 'Production only' }, { status: 403 });
  }

  try {
    const locationId = process.env.SQUARE_LOCATION_ID;
    if (!locationId) throw new Error('Square location unavailable');

    const matches = new Map<string, CatalogMatch>();
    for (const item of await catalogItems()) {
      const name = normalizedName(item?.item_data?.name);
      if (!TARGETS.has(name)) continue;
      if (matches.has(name)) {
        return NextResponse.json({ error: 'Duplicate Square catalog item', product: TARGETS.get(name) }, { status: 409 });
      }
      const variations = (item?.item_data?.variations || [])
        .filter((v: any) => typeof v?.id === 'string' && v.id.length > 0)
        .map((v: any): CatalogVariation => ({
          id: v.id,
          name: String(v?.item_variation_data?.name || 'Default'),
          trackingEnabled: typeof v?.item_variation_data?.track_inventory === 'boolean'
            ? v.item_variation_data.track_inventory
            : null,
        }));
      if (variations.length === 0) {
        return NextResponse.json({ error: 'Catalog has no variations', product: TARGETS.get(name) }, { status: 409 });
      }
      matches.set(name, { product: String(item.item_data.name), variations });
    }

    const missing = [...TARGETS.keys()].filter(name => !matches.has(name));
    if (missing.length) {
      return NextResponse.json({ error: 'Catalog targets missing', missing }, { status: 409 });
    }

    const ids = [...matches.values()].flatMap(product => product.variations.map(v => v.id));
    const counts = await stockCounts(ids, locationId);
    const inventory = [...TARGETS.keys()].map(name => {
      const item = matches.get(name)!;
      const variations = item.variations.map(v => {
        const record = counts.get(v.id);
        return {
          name: v.name,
          variationId: v.id,
          quantity: record?.quantity ?? null,
          countStatus: record ? 'reported' : 'unknown',
          trackingEnabled: v.trackingEnabled,
          calculatedAt: record?.calculatedAt || null,
        };
      });
      const complete = variations.every(v => v.quantity !== null);
      return {
        product: item.product,
        count: complete
          ? variations.reduce((sum, v) => sum + (v.quantity as number), 0)
          : null,
        variations,
      };
    });
    const unknownVariations = inventory.reduce(
      (sum, product) => sum + product.variations.filter(v => v.quantity === null).length, 0,
    );

    return NextResponse.json({
      source: 'square_inventory_rest',
      environment: 'production',
      asOf: new Date().toISOString(),
      fullyCounted: unknownVariations === 0,
      unknownVariations,
      inventory,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Inventory read failed' }, { status: 502 });
  }
}
