import { openTursoPreview, TursoPreviewRefusal } from './turso-preview-runtime.mjs';

const invalid = () => new TursoPreviewRefusal('ORDER_RECORD_RECONCILIATION_REQUIRED', 503);
function money(value) {
  if (typeof value !== 'number' && typeof value !== 'bigint') throw invalid();
  const cents = Number(value);
  if (!Number.isSafeInteger(cents) || cents < 0) throw invalid();
  return cents / 100;
}
function snapshot(value) {
  let parsed;
  try { parsed = JSON.parse(value); } catch { throw invalid(); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw invalid();
  return parsed;
}

/** Read only. The caller MUST authorize the returned canonical ID and customer. */
export async function readTursoOrder(db, orderRef) {
  if (typeof orderRef !== 'string' || !orderRef || orderRef.length > 200) {
    throw new TursoPreviewRefusal('ORDER_ID_INVALID', 400);
  }
  // Historical order numbers are not unique. Never guess a record from a suffix.
  const matches = await db.all('SELECT * FROM orders WHERE id=? OR order_number=? OR id IN (SELECT order_id FROM order_references WHERE reference=?) LIMIT 2', orderRef, orderRef, orderRef);
  if (matches.length === 0) return null;
  if (matches.length !== 1) throw invalid();
  const row = matches[0];
  if (row.currency !== 'USD') throw invalid();
  const customer = snapshot(row.customer_snapshot_json);
  if (typeof customer.email !== 'string' || !customer.email.trim()) throw invalid();
  const fulfillment = snapshot(row.fulfillment_json);
  if (!['pickup_market', 'pickup'].includes(fulfillment.type)) throw invalid();
  const lines = await db.all('SELECT * FROM order_items WHERE order_id=? ORDER BY position', row.id);
  if (!lines.length) throw invalid();
  const items = lines.map(line => {
    const quantity = Number(line.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1) throw invalid();
    const price = money(line.unit_price_cents);
    const lineTotal = money(line.total_cents);
    if (Number(line.unit_price_cents) * quantity !== Number(line.total_cents)) throw invalid();
    return { productId: line.product_id, variationId: line.variation_id,
      name: line.name_snapshot, quantity, price, lineTotal };
  });
  const total = money(row.total_cents);
  const subtotal = money(row.subtotal_cents);
  const tax = money(row.tax_cents);
  // This adapter supports the currently admitted pickup orders only. Unknown fees
  // cannot be presented as zero or inferred from incomplete historical snapshots.
  if (items.reduce((sum, _, i) => sum + Number(lines[i].total_cents), 0) !== Number(row.subtotal_cents) ||
      Number(row.subtotal_cents) + Number(row.tax_cents) !== Number(row.total_cents)) throw invalid();
  const payments = await db.all("SELECT * FROM payments WHERE order_id=? AND status='COMPLETED'", row.id);
  if (payments.length > 1) throw invalid();
  const payment = payments[0];
  const financialState = String(row.payment_status || '').toLowerCase();
  if (['paid', 'refunded', 'partially_refunded'].includes(financialState) &&
      (!payment || !payment.square_payment_id || payment.currency !== 'USD' ||
       Number(payment.amount_cents) !== Number(row.total_cents) ||
       Number(row.amount_paid_cents) !== Number(payment.amount_cents))) throw invalid();
  if (payment && !['paid', 'refunded', 'partially_refunded'].includes(financialState)) throw invalid();
  const refunds = await db.all('SELECT payment_id,amount_cents,currency FROM square_refund_entries WHERE order_id=?', row.id);
  let refundedCents = 0;
  for (const refund of refunds) {
    money(refund.amount_cents);
    if (!payment || refund.payment_id !== payment.square_payment_id || refund.currency !== 'USD' ||
        Number(refund.amount_cents) <= 0) throw invalid();
    refundedCents += Number(refund.amount_cents);
    if (!Number.isSafeInteger(refundedCents) || refundedCents > Number(payment.amount_cents)) throw invalid();
  }
  if ((financialState === 'paid' && refundedCents !== 0) ||
      (financialState === 'refunded' && refundedCents !== Number(row.total_cents)) ||
      (financialState === 'partially_refunded' && (refundedCents <= 0 || refundedCents >= Number(row.total_cents)))) throw invalid();
  return {
    id: row.id, orderNumber: row.order_number || 'TOG-' + row.id.slice(-8),
    status: row.status, paymentStatus: row.payment_status, customer, items, total,
    pricing: { subtotal, tax, total, deliveryFee: 0, tip: 0, discount: 0 },
    fulfillment, fulfillmentType: fulfillment.type || null,
    createdAt: row.created_at, updatedAt: row.updated_at,
    paidAt: payment?.created_at || null,
    payment: { status: row.payment_status, receiptUrl: payment?.receipt_url || null,
      capturedAmount: payment ? money(payment.amount_cents) : 0, refundedAmount: refundedCents / 100 },
  };
}

export async function getTursoPreviewOrder(orderRef) {
  return readTursoOrder(await openTursoPreview(), orderRef);
}
