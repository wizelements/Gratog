import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { readTursoOrder } from '../../lib/checkout/turso-order-read.mjs';

function fixture() {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys=ON');
  for (const file of readdirSync('db/migrations').filter(x => x.endsWith('.sql')).sort()) {
    raw.exec(readFileSync('db/migrations/' + file, 'utf8'));
  }
  raw.prepare(`INSERT INTO orders(id,source_collection,order_number,status,payment_status,
    customer_snapshot_json,fulfillment_json,subtotal_cents,tax_cents,total_cents,currency,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run('o1', 'orders', 'TOG-test', 'pending', 'pending',
    JSON.stringify({ name: 'Read test', email: 'read@example.invalid' }),
    JSON.stringify({ type: 'pickup_market' }),1199,0,1199,'USD','2026-10-18','2026-10-18');
  raw.prepare('INSERT INTO order_items(id,order_id,name_snapshot,quantity,unit_price_cents,total_cents,position) VALUES (?,?,?,?,?,?,?)')
    .run('i1','o1','Strawberry Bliss',1,1199,1199,0);
  const db = { all: async (sql,...values) => raw.prepare(sql).all(...values) };
  function paid() {
    raw.prepare("UPDATE orders SET payment_status='paid',status='paid',amount_paid_cents=1199 WHERE id='o1'").run();
    raw.prepare("INSERT INTO payments(id,order_id,square_payment_id,status,amount_cents,currency,created_at) VALUES ('p1','o1','sq1','COMPLETED',1199,'USD','2026-10-18')").run();
  }
  return { raw, db, paid };
}
test('reads the canonical pickup snapshot by exact ID and stored number without Mongo', async () => {
  const f=fixture();
  try {
    const order=await readTursoOrder(f.db,'TOG-test');
    assert.equal(order.id,'o1'); assert.equal(order.total,11.99);
    assert.equal(order.customer.email,'read@example.invalid');
    assert.equal(order.paymentStatus,'pending'); assert.equal(order.payment.capturedAmount,0);
    assert.deepEqual(await readTursoOrder(f.db,'o1'),order);
    assert.equal(await readTursoOrder(f.db,'test'),null);
  } finally { f.raw.close(); }
});
test('unknown order does not become a fallback record and DB failure propagates', async () => {
  const f=fixture();
  try { assert.equal(await readTursoOrder(f.db,'missing'),null); }
  finally { f.raw.close(); }
  await assert.rejects(readTursoOrder({all:async()=>{throw Error('connection-unavailable')}},'o1'),/connection-unavailable/);
});
test('paid order without a unique matching capture cannot show payment confirmation', async () => {
  const f=fixture();
  try {
    f.raw.exec("UPDATE orders SET payment_status='paid'");
    await assert.rejects(readTursoOrder(f.db,'o1'),/RECONCILIATION_REQUIRED/);
    f.paid(); assert.equal((await readTursoOrder(f.db,'o1')).payment.capturedAmount,11.99);
    f.raw.exec("INSERT INTO payments(id,order_id,square_payment_id,status,amount_cents,currency) VALUES ('p2','o1','sq2','COMPLETED',1199,'USD')");
    await assert.rejects(readTursoOrder(f.db,'o1'),/RECONCILIATION_REQUIRED/);
  } finally { f.raw.close(); }
});
test('refund state must match the exact payment and cumulative completed refund ledger', async () => {
  const f=fixture();
  try {
    f.paid(); f.raw.exec("UPDATE orders SET payment_status='refunded'");
    await assert.rejects(readTursoOrder(f.db,'o1'),/RECONCILIATION_REQUIRED/);
    f.raw.exec("INSERT INTO square_refund_entries VALUES ('r1','o1','sq1',500,'USD','2026-10-18')");
    f.raw.exec("UPDATE orders SET payment_status='partially_refunded'");
    assert.equal((await readTursoOrder(f.db,'o1')).payment.refundedAmount,5);
    f.raw.exec("INSERT INTO square_refund_entries VALUES ('r2','o1','sq1',699,'USD','2026-10-18')");
    f.raw.exec("UPDATE orders SET payment_status='refunded'");
    assert.equal((await readTursoOrder(f.db,'o1')).payment.refundedAmount,11.99);
    f.raw.exec("UPDATE square_refund_entries SET payment_id='wrong-payment' WHERE refund_id='r1'");
    await assert.rejects(readTursoOrder(f.db,'o1'),/RECONCILIATION_REQUIRED/);
  } finally { f.raw.close(); }
});
test('malformed prices, hidden fees, corrupt snapshots and ambiguous order numbers block display', async () => {
  for (const mutation of [
    "UPDATE orders SET total_cents=1299", "UPDATE orders SET subtotal_cents=NULL",
    "UPDATE orders SET customer_snapshot_json='[]'", "UPDATE order_items SET unit_price_cents=0",
    `UPDATE orders SET fulfillment_json='{"type":"shipping"}'`,
    "INSERT INTO orders(id,source_collection,order_number,status,total_cents,created_at,updated_at) VALUES ('o2','orders','TOG-test','pending',1199,'now','now')",
  ]) {
    const f=fixture();
    try { f.raw.exec(mutation); await assert.rejects(readTursoOrder(f.db,'TOG-test'),/RECONCILIATION_REQUIRED/); }
    finally { f.raw.close(); }
  }
});
