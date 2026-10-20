import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeSqlite} from '../helpers/native-sqlite.mjs';
import {adjustTursoInventory,getTursoInventory} from '../../lib/inventory/turso-inventory.mjs';
function fixture(stock=5){
  const f=nativeSqlite();
  f.importDoc('admin_users',{_id:'staff',id:'staff-business',email:'staff@example.invalid',role:'admin',isActive:true,
    createdAt:'2026-10-18T12:00:00Z',updatedAt:'2026-10-18T12:00:00Z'});
  f.raw.exec("INSERT INTO products(id,name,active) VALUES('product','Stock Fixture',1)");
  f.raw.prepare("INSERT INTO inventory(product_id,current_stock,low_stock_threshold,active,source,updated_at) VALUES('product',?,2,1,'fixture','2026-10-18T12:00:00Z')").run(stock);
  const claim={id:'staff',email:'staff@example.invalid',role:'admin',sessionVersion:1};
  const request={productId:'product',adjustment:2,reason:'Counted delivery',actorId:'staff',claim,expectedVersion:0,requestKey:'stock-adjustment-key-12345'};
  return {...f,claim,request};
}
test('stock adjustment, event and retry receipt commit once; subsequent retry does not alter new stock',async()=>{
  const f=fixture();try{
    const first=await adjustTursoInventory(f.db,f.request);
    assert.equal(first.newStock,7);assert.equal(first.replayed,false);assert.equal(first.version,1);
    f.raw.exec("UPDATE inventory SET current_stock=current_stock-1 WHERE product_id='product'");
    const second=await adjustTursoInventory(f.db,f.request);
    assert.equal(second.replayed,true);assert.equal(second.newStock,7);
    assert.equal((await getTursoInventory(f.db,'product')).currentStock,6);
    assert.equal(f.raw.prepare('SELECT count(*) n FROM inventory_events').get().n,1);
    await assert.rejects(adjustTursoInventory(f.db,{...f.request,adjustment:3}),/IDEMPOTENCY_CONFLICT/);
  }finally{f.close()}
});
test('checkout stock change invalidates a stale staff adjustment version',async()=>{
  const f=fixture(1);try{
    f.raw.exec("UPDATE inventory SET current_stock=current_stock-1 WHERE product_id='product' AND current_stock>=1");
    await assert.rejects(adjustTursoInventory(f.db,{...f.request,adjustment:-1}),/CONCURRENT_MODIFICATION/);
    assert.equal((await getTursoInventory(f.db,'product')).currentStock,0);
    assert.equal(f.raw.prepare('SELECT count(*) n FROM inventory_staff_adjustments').get().n,0);
  }finally{f.close()}
});
test('failed audit rolls back stock and idempotency; retry then performs exactly one adjustment',async()=>{
  const f=fixture();try{
    f.inject(q=>{if(q.startsWith('INSERT INTO inventory_events'))throw Error('STORAGE_FAILURE')});
    await assert.rejects(adjustTursoInventory(f.db,f.request),/STORAGE_FAILURE/);
    assert.equal((await getTursoInventory(f.db,'product')).currentStock,5);
    assert.equal(f.raw.prepare('SELECT count(*) n FROM inventory_staff_adjustments').get().n,0);
    f.inject(()=>{});await adjustTursoInventory(f.db,f.request);
    assert.equal((await getTursoInventory(f.db,'product')).currentStock,7);
  }finally{f.close()}
});
test('revoked administrator cannot alter stock or reuse a prior successful adjustment receipt',async()=>{
  const f=fixture();try{
    await adjustTursoInventory(f.db,f.request);
    f.raw.exec("UPDATE admin_identities SET is_active=0 WHERE id='staff'");
    await assert.rejects(adjustTursoInventory(f.db,f.request),/ADMIN_ACCESS_REVOKED/);
    assert.equal((await getTursoInventory(f.db,'product')).currentStock,7);
  }finally{f.close()}
});
test('historical negative balance is visible and never clamped or silently repaired',async()=>{
  const f=fixture(-2);try{
    const before=await getTursoInventory(f.db,'product');assert.equal(before.currentStock,-2);assert.equal(before.requiresReconciliation,true);
    await assert.rejects(adjustTursoInventory(f.db,{...f.request,adjustment:1}),/INSUFFICIENT_STOCK/);
    assert.equal((await getTursoInventory(f.db,'product')).currentStock,-2);
    await adjustTursoInventory(f.db,{...f.request,adjustment:3});
    const event=f.raw.prepare('SELECT adjustment,metadata_json FROM inventory_events').get();
    assert.equal(event.adjustment,3);assert.equal(JSON.parse(event.metadata_json).previousStock,-2);
  }finally{f.close()}
});
