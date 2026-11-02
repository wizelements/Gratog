import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';

function makeFixture() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  for (const name of readdirSync('db/migrations').filter(x => x.endsWith('.sql')).sort()) {
    db.exec(readFileSync('db/migrations/' + name, 'utf8'));
  }
  db.prepare('INSERT INTO products (id,name) VALUES (?,?)').run('sku1','Test item');
  db.prepare('INSERT INTO inventory (product_id,current_stock,source,updated_at) VALUES (?,?,?,?)')
    .run('sku1',1,'test','2026-10-17T00:00:00Z');
  for(const id of ['order1','order2']) db.prepare(
    'INSERT INTO orders (id,source_collection,status,total_cents,created_at,updated_at) VALUES (?,?,?,?,?,?)'
  ).run(id,'orders','pending',1199,'2026-10-17T00:00:00Z','2026-10-17T00:00:00Z');
  return db;
}

test('all Turso migrations apply locally and include checkout safety contracts', () => {
  const db=makeFixture();
  const required=['checkout_stock_claims','checkout_stock_claim_items','square_refund_entries','checkout_notification_outbox'];
  for(const name of required) assert.equal(
    db.prepare('SELECT count(*) count FROM sqlite_master WHERE type = ? AND name = ?').get('table',name).count,1
  );
  db.close();
});

test('conditional inventory reservation and SQL claim are atomic; the last unit is not oversold', () => {
  const db=makeFixture();
  const now='2026-10-17T00:00:00Z';
  function reserve(orderId) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const prior=db.prepare('SELECT status,items_fingerprint FROM checkout_stock_claims WHERE order_id=?').get(orderId);
      if (prior) {
        if (prior.items_fingerprint !== 'sku1:1') throw new Error('CHECKOUT_STOCK_CLAIM_CONFLICT');
        db.exec('COMMIT'); return prior.status === 'reserved' || prior.status === 'committed';
      }
      const update=db.prepare('UPDATE inventory SET current_stock=current_stock-1 WHERE product_id=? AND current_stock>=1').run('sku1');
      if(update.changes!==1) {db.exec('ROLLBACK');return false;}
      db.prepare('INSERT INTO checkout_stock_claims (order_id,status,items_fingerprint,reserved_at,updated_at) VALUES (?,?,?,?,?)')
        .run(orderId,'reserved','sku1:1',now,now);
      db.prepare('INSERT INTO checkout_stock_claim_items(order_id,product_id,quantity) VALUES (?,?,?)')
        .run(orderId,'sku1',1);
      db.exec('COMMIT');return true;
    } catch(error) { db.exec('ROLLBACK');throw error; }
  }
  assert.equal(reserve('order1'),true);
  assert.equal(reserve('order2'),false);
  assert.equal(db.prepare('SELECT current_stock FROM inventory WHERE product_id=?').get('sku1').current_stock,0);
  assert.equal(db.prepare('SELECT count(*) n FROM checkout_stock_claims').get().n,1);
  assert.equal(db.prepare('SELECT count(*) n FROM checkout_stock_claim_items').get().n,1);
  assert.equal(reserve('order1'),true, 'same order replay must reuse previous reservation');
  assert.equal(db.prepare('SELECT current_stock FROM inventory WHERE product_id=?').get('sku1').current_stock,0);
  db.close();
});

test('a failed multi-item reservation rolls back every stock decrement and claim',()=>{
  const db=makeFixture();
  const now='2026-10-17';
  db.prepare('INSERT INTO products(id,name) VALUES (?,?)').run('sku2','Sold out item');
  db.prepare('INSERT INTO inventory(product_id,current_stock,source,updated_at) VALUES (?,?,?,?)')
    .run('sku2',0,'test',now);
  const reserve=db.prepare('UPDATE inventory SET current_stock=current_stock-? WHERE product_id=? AND current_stock>=?');
  db.exec('BEGIN IMMEDIATE');
  let succeeded=true;
  try {
    for(const [sku,qty] of [['sku1',1],['sku2',1]]) {
      if(reserve.run(qty,sku,qty).changes !== 1) {succeeded=false; break;}
    }
    if(!succeeded) db.exec('ROLLBACK');
    else db.exec('COMMIT');
  } catch(error) {db.exec('ROLLBACK');throw error;}
  assert.equal(succeeded,false);
  assert.equal(db.prepare('SELECT current_stock FROM inventory WHERE product_id=?').get('sku1').current_stock,1);
  assert.equal(db.prepare('SELECT current_stock FROM inventory WHERE product_id=?').get('sku2').current_stock,0);
  assert.equal(db.prepare('SELECT count(*) n FROM checkout_stock_claims').get().n,0);
  db.close();
});

test('partial refunds retain exact cents; cumulative over-refunds are refused',()=>{
  const db=makeFixture();
  const add=db.prepare('INSERT INTO square_refund_entries (refund_id,order_id,payment_id,amount_cents,currency,confirmed_at) VALUES (?,?,?,?,?,?)');
  function reconcile(refundId,cents) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const paidCents=1199;
      const already=db.prepare('SELECT * FROM square_refund_entries WHERE refund_id=?').get(refundId);
      if (already) {
        if(already.amount_cents!==cents||already.order_id!=='order1'||already.payment_id!=='payment1') throw Error('REFUND_ID_CONFLICT');
        db.exec('COMMIT');return 'replay';
      }
      const total=db.prepare('SELECT coalesce(sum(amount_cents),0) cents FROM square_refund_entries WHERE order_id=?').get('order1').cents;
      if(!Number.isSafeInteger(cents)||cents<1||total+cents>paidCents) throw Error('REFUND_OVERPAY');
      add.run(refundId,'order1','payment1',cents,'USD','2026-10-17');
      db.exec('COMMIT');return 'recorded';
    } catch(error){db.exec('ROLLBACK');throw error;}
  }
  assert.equal(reconcile('r1',500),'recorded');
  assert.equal(reconcile('r1',500),'replay');
  assert.throws(()=>reconcile('r2',700),/REFUND_OVERPAY/);
  assert.equal(reconcile('r2',699),'recorded');
  assert.equal(db.prepare('SELECT sum(amount_cents) cents FROM square_refund_entries').get().cents,1199);
  assert.throws(()=>reconcile('r1',400),/REFUND_ID_CONFLICT/);
  db.close();
});

test('refund ID cannot be double counted or reused against another amount',()=>{
  const db=makeFixture();
  const insert=db.prepare('INSERT INTO square_refund_entries(refund_id,order_id,payment_id,amount_cents,currency,confirmed_at) VALUES (?,?,?,?,?,?)');
  insert.run('refund1','order1','payment1',1199,'USD','2026-10-17');
  assert.throws(()=>insert.run('refund1','order1','payment1',1199,'USD','2026-10-17'),/UNIQUE/);
  assert.throws(()=>insert.run('refund1','order2','payment2',100,'USD','2026-10-17'),/UNIQUE/);
  assert.equal(db.prepare('SELECT SUM(amount_cents) cents FROM square_refund_entries WHERE order_id=?').get('order1').cents,1199);
  db.close();
});

test('identical checkout attempt keys and duplicate notification sends are constrained',()=>{
  const db=makeFixture();
  const setKey=db.prepare('UPDATE orders SET checkout_attempt_key=? WHERE id=?');
  setKey.run('attempt1','order1');
  assert.throws(()=>setKey.run('attempt1','order2'),/UNIQUE/);
  const notify=db.prepare('INSERT INTO checkout_notification_outbox(order_id,kind,status,updated_at) VALUES (?,?,?,?)');
  notify.run('order1','customer_confirmation','pending','2026-10-17');
  assert.throws(()=>notify.run('order1','customer_confirmation','pending','2026-10-17'),/UNIQUE/);
  db.close();
});
