import 'server-only';
import { getTursoConnection } from '@/lib/db/turso';

type SqlClient = ReturnType<typeof getTursoConnection>;

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== 'string' || value.length === 0) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

const maskEmail = (email: unknown) => {
  if (typeof email !== 'string' || email.length === 0) return '';
  const at = email.indexOf('@');
  return at < 0 ? `${email.slice(0, 2)}***` : `${email.slice(0, 2)}***${email.slice(at)}`;
};

const sortColumns = {
  createdAt: 'c.created_at', name: 'c.name', email: 'c.email', lastOrderDate: 'last_order_date',
} as const;

function filters(input: { search?: string; hasOrders?: string; rewardsTier?: string }) {
  const clauses: string[] = [];
  const args: unknown[] = [];
  if (input.search) {
    clauses.push("(lower(coalesce(c.name,'')) LIKE ? ESCAPE '\\' OR lower(coalesce(c.email,'')) LIKE ? ESCAPE '\\')");
    const escaped = input.search.toLowerCase().replace(/[\\%_]/g, '\\$&');
    args.push(`%${escaped}%`, `%${escaped}%`);
  }
  if (input.hasOrders === 'true') clauses.push('c.total_orders > 0');
  if (input.hasOrders === 'false') clauses.push('c.total_orders = 0');
  if (input.rewardsTier) {
    clauses.push("coalesce(json_extract(c.preferences_json, '$.rewards.tier'), json_extract(c.preferences_json, '$.rewardsTier')) = ?");
    args.push(input.rewardsTier);
  }
  return { sql: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '', args };
}

export async function listAdminCustomers(input: {
  search?: string; page: number; limit: number; sortBy: keyof typeof sortColumns;
  sortOrder: 'asc' | 'desc'; hasOrders?: string; rewardsTier?: string;
}, client: SqlClient = getTursoConnection()) {
  const where = filters(input);
  const offset = (input.page - 1) * input.limit;
  const direction = input.sortOrder === 'asc' ? 'ASC' : 'DESC';
  const sort = sortColumns[input.sortBy];
  const rows = await client.all(
    `SELECT c.id, c.name, c.email, c.created_at, c.preferences_json, c.total_orders,
            c.total_spent_cents, max(o.created_at) AS last_order_date
       FROM customers c LEFT JOIN orders o ON o.customer_id = c.id${where.sql}
      GROUP BY c.id ORDER BY ${sort} ${direction}, c.id ASC LIMIT ? OFFSET ?`,
    ...where.args, input.limit, offset,
  );
  const countRow = await client.get(`SELECT count(*) AS total FROM customers c${where.sql}`, ...where.args);
  const stats = await client.get(
    `SELECT count(*) AS total,
            sum(CASE WHEN total_orders > 0 THEN 1 ELSE 0 END) AS with_orders,
            avg(total_orders) AS avg_orders,
            coalesce(sum(total_spent_cents), 0) AS total_value_cents
       FROM customers`,
  );
  return {
    customers: rows.map(row => ({
      _id: String(row.id), id: String(row.id), name: row.name, email: maskEmail(row.email),
      createdAt: row.created_at, rewards: parseJson<Record<string, unknown>>(row.preferences_json, {}).rewards ?? {},
      orderCount: Number(row.total_orders), totalSpent: Number(row.total_spent_cents), lastOrderDate: row.last_order_date,
    })),
    total: Number(countRow?.total ?? 0),
    stats: {
      total: Number(stats?.total ?? 0), withOrders: Number(stats?.with_orders ?? 0),
      avgOrders: Number(stats?.avg_orders ?? 0), totalRevenue: Number(stats?.total_value_cents ?? 0),
    },
  };
}

export async function exportCustomers(input: { search?: string; rewardsTier?: string }, client: SqlClient = getTursoConnection()) {
  const where = filters(input);
  const rows = await client.all(
    `SELECT c.id, c.name, c.email, c.created_at, c.preferences_json, c.total_orders, c.total_spent_cents
       FROM customers c${where.sql} ORDER BY c.id LIMIT 10000`, ...where.args,
  );
  return rows.map(row => ({
    id: String(row.id), name: row.name, email: row.email, createdAt: row.created_at,
    rewards: parseJson<Record<string, unknown>>(row.preferences_json, {}).rewards ?? {},
    orderCount: Number(row.total_orders), totalSpent: Number(row.total_spent_cents),
  }));
}

export async function getAdminCustomer(id: string, client: SqlClient = getTursoConnection()) {
  const row = await client.get(
    `SELECT id, email, name, phone, square_customer_id, preferences_json, total_orders,
            total_spent_cents, created_at, updated_at FROM customers WHERE id = ? LIMIT 1`, id,
  );
  if (!row) return null;
  return {
    _id: String(row.id), id: String(row.id), email: row.email, name: row.name, phone: row.phone,
    squareCustomerId: row.square_customer_id,
    ...parseJson<Record<string, unknown>>(row.preferences_json, {}),
    orderCount: Number(row.total_orders), totalSpent: Number(row.total_spent_cents),
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export async function listRecentCustomerOrders(customerId: string, client: SqlClient = getTursoConnection()) {
  const orders = await client.all(
    `SELECT id, order_number, status, total_cents, created_at FROM orders
      WHERE customer_id = ? ORDER BY created_at DESC LIMIT 10`, customerId,
  );
  if (!orders.length) return [];
  const placeholders = orders.map(() => '?').join(',');
  const items = await client.all(
    `SELECT order_id, id, name_snapshot, quantity, unit_price_cents, total_cents, position FROM (
       SELECT order_id, id, name_snapshot, quantity, unit_price_cents, total_cents, position,
              row_number() OVER (PARTITION BY order_id ORDER BY position) AS item_rank
         FROM order_items WHERE order_id IN (${placeholders})
     ) WHERE item_rank <= 3 ORDER BY order_id, position`,
    ...orders.map(row => row.id),
  );
  return orders.map(order => ({
    id: order.id, orderNumber: order.order_number, status: order.status,
    total: Number(order.total_cents), createdAt: order.created_at,
    items: items.filter(item => item.order_id === order.id).slice(0, 3).map(item => ({
      id: item.id, name: item.name_snapshot, quantity: Number(item.quantity),
      price: Number(item.unit_price_cents), total: Number(item.total_cents),
    })),
  }));
}
