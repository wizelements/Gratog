import { parentPort, workerData } from 'node:worker_threads';
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(workerData.dbPath, { timeout: 20000 });
db.exec('PRAGMA foreign_keys=ON');
db.exec('PRAGMA busy_timeout=20000');
const now = '2026-10-17T00:00:00Z';
let status = 'unknown';
try {
  db.exec('BEGIN IMMEDIATE');
  const existing = db.prepare('SELECT status,items_fingerprint FROM checkout_stock_claims WHERE order_id=?').get(workerData.orderId);
  if(existing) {
    status = existing.items_fingerprint === 'sku:1' && existing.status !== 'released' ? 'replay' : 'conflict';
    db.exec('COMMIT');
  } else {
    const updated = db.prepare('UPDATE inventory SET current_stock=current_stock-1 WHERE product_id=? AND current_stock>=1').run('sku');
    if(updated.changes === 1) {
      db.prepare('INSERT INTO checkout_stock_claims (order_id,status,items_fingerprint,reserved_at,updated_at) VALUES (?,?,?,?,?)')
        .run(workerData.orderId,'reserved','sku:1',now,now);
      db.prepare('INSERT INTO checkout_stock_claim_items(order_id,product_id,quantity) VALUES (?,?,?)')
        .run(workerData.orderId,'sku',1);
      status='reserved';
      db.exec('COMMIT');
    } else {
      status='out_of_stock';
      db.exec('ROLLBACK');
    }
  }
} catch(error) {
  try { db.exec('ROLLBACK') } catch {}
  status = 'error:' + String(error.message || error);
} finally { db.close(); }
parentPort.postMessage({status});
