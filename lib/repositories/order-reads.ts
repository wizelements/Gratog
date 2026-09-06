import 'server-only';

import { getTursoConnection } from '@/lib/db/turso';

type SqlExecutor = Pick<ReturnType<typeof getTursoConnection>, 'all'>;

type OrderRow = {
  id: string;
  order_number: string | null;
  status: string;
  total_cents: number;
  fulfillment_json: string | null;
  created_at: string;
};

type OrderItemRow = {
  order_id: string;
  id: string;
  name_snapshot: string;
  quantity: number;
  unit_price_cents: number | null;
  total_cents: number | null;
  external_catalog_id: string | null;
  position: number;
};

function parseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function listMarketOrdersForUser(
  userId: string,
  email: string,
  executor: SqlExecutor = getTursoConnection(),
) {
  const normalizedEmail = email.trim().toLowerCase();
  const orders = await executor.all(
    `SELECT id, order_number, status, total_cents, fulfillment_json, created_at
       FROM orders
      WHERE source_collection = 'marketorders'
        AND (
          customer_id = ?
          OR lower(coalesce(json_extract(customer_snapshot_json, '$.email'), '')) = ?
        )
      ORDER BY created_at DESC
      LIMIT 50`,
    userId,
    normalizedEmail,
  ) as OrderRow[];

  if (orders.length === 0) return [];

  const placeholders = orders.map(() => '?').join(',');
  const items = await executor.all(
    `SELECT order_id, id, name_snapshot, quantity, unit_price_cents,
            total_cents, external_catalog_id, position
       FROM order_items
      WHERE order_id IN (${placeholders})
      ORDER BY order_id, position`,
    ...orders.map((order) => order.id),
  ) as OrderItemRow[];

  const itemsByOrder = new Map<string, Array<Record<string, unknown>>>();
  for (const item of items) {
    const mapped = {
      id: item.id,
      name: item.name_snapshot,
      quantity: Number(item.quantity),
      price: item.unit_price_cents == null ? null : Number(item.unit_price_cents),
      priceCents: item.unit_price_cents == null ? null : Number(item.unit_price_cents),
      totalCents: item.total_cents == null ? null : Number(item.total_cents),
      productId: item.external_catalog_id,
    };
    const existing = itemsByOrder.get(item.order_id) ?? [];
    existing.push(mapped);
    itemsByOrder.set(item.order_id, existing);
  }

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    items: itemsByOrder.get(order.id) ?? [],
    total: Number(order.total_cents),
    fulfillment: parseJson(order.fulfillment_json),
    createdAt: order.created_at,
  }));
}
