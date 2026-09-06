import 'server-only';

import { getTursoConnection } from '@/lib/db/turso';

function parseObject(value: unknown): Record<string, any> {
  if (typeof value !== 'string' || value.length === 0) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function getPaymentStatusByOrderId(orderId: string) {
  const db = getTursoConnection();
  const orderRow = await db.get(
    `SELECT id, order_number, status, payment_status, customer_snapshot_json,
            fulfillment_json, updated_at
       FROM orders
      WHERE id = ?
      LIMIT 1`,
    orderId,
  );
  if (!orderRow) return null;

  const paymentRow = await db.get(
    `SELECT id, status, amount_cents, currency, receipt_url,
            provider_metadata_json, created_at, updated_at
       FROM payments
      WHERE order_id = ?
      ORDER BY coalesce(updated_at, created_at, '') DESC, id DESC
      LIMIT 1`,
    orderId,
  );

  const customer = parseObject(orderRow.customer_snapshot_json);
  const fulfillment = parseObject(orderRow.fulfillment_json);
  const provider = parseObject(paymentRow?.provider_metadata_json);
  const amountAuthority = provider.amountAuthority ?? 'stored';

  return {
    order: {
      id: orderRow.id,
      orderNumber: orderRow.order_number,
      status: orderRow.status,
      paymentStatus: orderRow.payment_status,
      paidAt: provider.paidAt ?? null,
      receiptUrl: paymentRow?.receipt_url ?? provider.receiptUrl ?? null,
      customer,
      customerEmail: customer.email ?? null,
      fulfillment,
      updatedAt: orderRow.updated_at,
    },
    payment: paymentRow
      ? {
          id: paymentRow.id,
          status: paymentRow.status,
          // A zero amount is preserved as stored history; it is never promoted
          // to an authoritative Square payment amount by this read model.
          amountCents: amountAuthority === 'unavailable' ? null : Number(paymentRow.amount_cents),
          currency: paymentRow.currency || 'USD',
          receiptUrl: paymentRow.receipt_url ?? provider.receiptUrl ?? null,
          cardLast4: provider.cardLast4 ?? provider.card?.last4 ?? null,
          cardBrand: provider.cardBrand ?? provider.card?.cardBrand ?? null,
          amountAuthority,
        }
      : null,
  };
}
