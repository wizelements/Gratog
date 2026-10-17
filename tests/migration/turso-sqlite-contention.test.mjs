import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';

test('24 separate SQLite clients contend for the final unit without duplicate reservation', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'gratog-sqlite-race-'));
  const path = join(dir, 'race.db');
  try {
    const seed = new DatabaseSync(path);
    seed.exec('PRAGMA foreign_keys=ON');
    for(const filename of readdirSync('db/migrations').filter(n => n.endsWith('.sql')).sort())
      seed.exec(readFileSync('db/migrations/' + filename, 'utf8'));
    seed.prepare('INSERT INTO products(id,name) VALUES (?,?)').run('sku','Last unit');
    seed.prepare('INSERT INTO inventory(product_id,current_stock,source,updated_at) VALUES (?,?,?,?)')
      .run('sku',1,'test','2026-10-17T00:00:00Z');
    const addOrder = seed.prepare('INSERT INTO orders(id,source_collection,status,total_cents,created_at,updated_at) VALUES (?,?,?,?,?,?)');
    for(let i=0;i<24;i++) addOrder.run('order-'+i,'orders','pending',1199,'2026-10-17','2026-10-17');
    seed.close();
    const outcomes=await Promise.all(Array.from({length:24},(_,i)=>
      new Promise((resolve,reject)=>{
        const w = new Worker(new URL('./sqlite-reservation-worker.mjs', import.meta.url),{workerData:{dbPath:path,orderId:'order-'+i}});
        w.once('message',resolve);w.once('error',reject);
        w.once('exit',(code)=>{if(code!==0)reject(new Error('worker exit code '+code))});
      })
    ));
    const statuses=outcomes.map(x=>x.status);
    assert.equal(statuses.filter(s=>s==='reserved').length,1,JSON.stringify(statuses));
    assert.equal(statuses.filter(s=>s==='out_of_stock').length,23,JSON.stringify(statuses));
    const verify=new DatabaseSync(path);
    assert.equal(verify.prepare('SELECT current_stock FROM inventory WHERE product_id=?').get('sku').current_stock,0);
    assert.equal(verify.prepare('SELECT COUNT(*) count FROM checkout_stock_claims').get().count,1);
    assert.equal(verify.prepare('SELECT COUNT(*) count FROM checkout_stock_claim_items').get().count,1);
    verify.close();
  } finally {rmSync(dir,{recursive:true,force:true});}
});
