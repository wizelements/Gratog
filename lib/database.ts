import { createHash } from 'crypto';
import type { Product } from '@/types/product';
import { getTursoConnection } from './db/turso';

type SqlValue = string | number | null;
type Row = Record<string, unknown>;

/** Compatibility export for catalog callers; this is now a Turso connection. */
export async function getDatabase() { return getTursoConnection(); }

export function generateProductHash(product: Product): string {
  const normalized = {
    title: product.title,
    description: product.description,
    variants: product.variants.map(({ sku, price_cents, options }) => ({ sku, price_cents, options })),
    images: product.images.map(({ url, position }) => ({ url, position })),
  };
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

const stableId = (namespace: string, value: string) =>
  `${namespace}:${createHash('sha256').update(value).digest('hex').slice(0, 32)}`;

function metadata(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string' || !value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

function stockStatus(value: unknown): Product['variants'][number]['availability'] {
  if (value == null || !Number.isFinite(Number(value))) return 'unknown';
  if (Number(value) <= 0) return 'out';
  return Number(value) <= 5 ? 'low' : 'in_stock';
}

async function hydrateProduct(product: Row): Promise<Product> {
  const db = await getDatabase();
  const meta = metadata(product.metadata_json);
  const variations = await db.all(
    'SELECT id, name, price_cents, currency, active FROM product_variations WHERE product_id = ? ORDER BY id',
    String(product.id),
  ) as Row[];
  const inventory = await db.get(
    'SELECT current_stock FROM inventory WHERE product_id = ? LIMIT 1', String(product.id),
  ) as Row | undefined;
  const storedVariants = Array.isArray(meta.variants) ? meta.variants as Row[] : [];
  const bySku = new Map(storedVariants.map((variant) => [String(variant.sku ?? ''), variant]));
  const availability = stockStatus(inventory?.current_stock);

  return {
    slug: String(product.slug ?? ''),
    title: String(product.name ?? ''),
    description: String(product.description ?? ''),
    brand: typeof meta.brand === 'string' ? meta.brand : undefined,
    category: typeof meta.category === 'string' ? meta.category : undefined,
    images: Array.isArray(meta.images) ? meta.images as Product['images'] : [],
    variants: variations.map((variation) => {
      const stored = bySku.get(String(variation.name ?? '')) ?? {};
      return {
        sku: String(stored.sku ?? variation.name ?? variation.id),
        options: stored.options && typeof stored.options === 'object' ? stored.options as Record<string, string> : {},
        price_cents: Number(variation.price_cents ?? 0),
        currency: String(variation.currency ?? 'USD'),
        ...(stored.compare_at_cents == null ? {} : { compare_at_cents: Number(stored.compare_at_cents) }),
        availability: Number(variation.active) === 0 ? 'out' : availability,
      };
    }),
    source_url: typeof meta.source_url === 'string' ? meta.source_url : '',
    handle: typeof meta.handle === 'string' ? meta.handle : undefined,
    active: Number(product.active) === 1,
  };
}

export async function upsertProduct(product: Product, sourceId = 'tasteofgratitude'): Promise<string> {
  const db = await getDatabase();
  const existing = await db.get('SELECT id, metadata_json FROM products WHERE slug = ? LIMIT 1', product.slug) as Row | undefined;
  const oldMeta = metadata(existing?.metadata_json);
  const hash = generateProductHash(product);
  const productId = existing ? String(existing.id) : stableId('product', `${sourceId}\0${product.slug}`);
  const now = new Date().toISOString();
  const version = Number(oldMeta.version ?? 0) + (oldMeta.hash === hash ? 0 : 1);
  const newMeta = JSON.stringify({
    ...oldMeta,
    source_id: sourceId,
    brand: product.brand ?? null,
    category: product.category ?? null,
    handle: product.handle ?? null,
    images: product.images,
    source_url: product.source_url,
    variants: product.variants,
    hash,
    version: Math.max(version, 1),
    first_seen_at: oldMeta.first_seen_at ?? now,
    last_seen_at: now,
  });
  await db.transactionAsync(async (tx) => {
    await tx.run(
      `INSERT INTO products (id, slug, name, description, active, metadata_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET slug=excluded.slug, name=excluded.name,
       description=excluded.description, active=excluded.active,
       metadata_json=excluded.metadata_json, updated_at=excluded.updated_at`,
      productId, product.slug, product.title, product.description, product.active ? 1 : 0,
      newMeta, (oldMeta.first_seen_at as SqlValue) ?? now, now,
    );
    await tx.run('DELETE FROM product_variations WHERE product_id = ?', productId);
    for (const variant of product.variants) {
      await tx.run(
        `INSERT INTO product_variations (id, product_id, name, price_cents, currency, active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        stableId('variation', `${productId}\0${variant.sku}`), productId, variant.sku,
        variant.price_cents, variant.currency, variant.availability === 'out' ? 0 : 1,
      );
    }
    const quantities = product.variants.map((variant) => variant.availability === 'in_stock' ? 100 : variant.availability === 'low' ? 5 : 0);
    await tx.run(
      `INSERT INTO inventory (product_id, current_stock, low_stock_threshold, active, source, updated_at)
       VALUES (?, ?, 5, ?, ?, ?)
       ON CONFLICT(product_id) DO UPDATE SET current_stock=excluded.current_stock,
       active=excluded.active, source=excluded.source, updated_at=excluded.updated_at`,
      productId, Math.max(0, ...quantities), product.active ? 1 : 0, sourceId, now,
    );
  });
  return productId;
}

export async function queryCatalog(params: {
  q?: string; category?: string; in_stock?: string; limit: number; cursor?: string;
}): Promise<{ items: Product[]; nextCursor?: string; etag: string }> {
  const db = await getDatabase();
  const where = ['p.active = 1'];
  const values: SqlValue[] = [];
  if (params.q) {
    where.push("(lower(p.name) LIKE ? ESCAPE '\\' OR lower(COALESCE(p.description, '')) LIKE ? ESCAPE '\\')");
    const escaped = params.q.toLowerCase().replace(/[\\%_]/g, '\\$&');
    values.push(`%${escaped}%`, `%${escaped}%`);
  }
  if (params.category) {
    where.push("lower(json_extract(p.metadata_json, '$.category')) = lower(?)");
    values.push(params.category);
  }
  if (params.in_stock === '1') where.push('COALESCE(i.current_stock, 0) > 0');
  if (params.in_stock === '0') where.push('COALESCE(i.current_stock, 0) <= 0');
  const offset = Math.max(0, Number.parseInt(params.cursor ?? '0', 10) || 0);
  const rows = await db.all(
    `SELECT p.* FROM products p LEFT JOIN inventory i ON i.product_id=p.id
     WHERE ${where.join(' AND ')}
     ORDER BY COALESCE(p.updated_at,p.created_at,'') DESC,p.id LIMIT ? OFFSET ?`,
    ...values, params.limit + 1, offset,
  ) as Row[];
  const hasMore = rows.length > params.limit;
  const selected = hasMore ? rows.slice(0, params.limit) : rows;
  const items: Product[] = [];
  for (const row of selected) items.push(await hydrateProduct(row));
  const hashes = selected.map((row) => metadata(row.metadata_json).hash ?? row.id);
  return {
    items,
    nextCursor: hasMore ? String(offset + params.limit) : undefined,
    etag: createHash('md5').update(JSON.stringify(hashes)).digest('hex'),
  };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const db = await getDatabase();
  const product = await db.get('SELECT * FROM products WHERE slug=? AND active=1 LIMIT 1', slug) as Row | undefined;
  return product ? hydrateProduct(product) : null;
}

export async function getHealthMetrics(): Promise<Record<string, number>> {
  const db = await getDatabase();
  const values = await db.get(
    `SELECT (SELECT count(*) FROM products WHERE active=1) total_products,
      (SELECT count(*) FROM product_variations) total_variants,
      (SELECT count(*) FROM inventory WHERE current_stock IS NULL) unknown_stock,
      (SELECT count(*) FROM inventory) total_stock,
      (SELECT min(updated_at) FROM products WHERE active=1) oldest_update`,
  ) as Row;
  const oldest = typeof values.oldest_update === 'string' ? Date.parse(values.oldest_update) : Number.NaN;
  const oldestMinutes = Number.isFinite(oldest) ? Math.max(0, Math.floor((Date.now() - oldest) / 60_000)) : 0;
  const totalStock = Number(values.total_stock ?? 0);
  return {
    total_products: Number(values.total_products ?? 0),
    total_variants: Number(values.total_variants ?? 0),
    crawl_success_rate: 100,
    avg_freshness_minutes: oldestMinutes,
    unknown_stock_percentage: totalStock ? Number(values.unknown_stock ?? 0) / totalStock * 100 : 0,
    oldest_crawl_minutes: oldestMinutes,
    pending_crawls: 0,
  };
}
