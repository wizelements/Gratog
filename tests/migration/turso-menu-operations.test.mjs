import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createTursoMenu,updateTursoMenu,activateTursoMenu,archiveTursoMenu,
  getTursoMenuById,listTursoMenus} from '../../lib/menus/turso-menus.mjs';

function fixture(){
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  for(const name of readdirSync('db/migrations').filter(x=>x.endsWith('.sql')).sort())
    sqlite.exec(readFileSync('db/migrations/'+name,'utf8'));
  let inject=()=>{};
  const db={
    get:async(sql,...args)=>sqlite.prepare(sql).get(...args),
    all:async(sql,...args)=>sqlite.prepare(sql).all(...args),
    run:async(sql,...args)=>{inject(sql,args);return sqlite.prepare(sql).run(...args)},
    transactionAsync:fn=>({immediate:async()=>{
      sqlite.exec('BEGIN IMMEDIATE');
      try{const result=await fn(db);sqlite.exec('COMMIT');return result}
      catch(error){sqlite.exec('ROLLBACK');throw error}
    }}),
  };
  return {db,sqlite,inject:fn=>{inject=fn}};
}
const menu={title:'Market Menu',description:'Weekly pickup',imageUrl:'https://example.invalid/menu.png',
  weekStart:new Date('2026-10-19T04:00:00Z'),weekEnd:new Date('2026-10-26T04:00:00Z'),
  linkedProducts:['old-product'],seasonalTags:['Autumn'],isActive:false,isArchived:false};
test('menus preserve imported identifiers, child ordering, dates and historical archive',async()=>{
  const {db,sqlite}=fixture();
  try{
    const created=await createTursoMenu(db,menu);
    assert.equal(created.weekStart,'2026-10-19T04:00:00.000Z');
    const updated=await updateTursoMenu(db,created.id,{title:'Revised Menu',linkedProducts:['product-b','old-product']});
    assert.deepEqual(updated.linkedProducts,['product-b','old-product']);
    assert.deepEqual(updated.seasonalTags,['Autumn']);
    assert.equal(updated.createdAt,created.createdAt);
    assert.equal((await listTursoMenus(db,'public')).length,0,'drafts stay private');
    await activateTursoMenu(db,created.id);
    assert.equal((await listTursoMenus(db,'active'))[0].id,created.id);
    await archiveTursoMenu(db,created.id);
    const archived=await getTursoMenuById(db,created.id);
    assert.equal(archived.isActive,false);
    assert.equal(archived.isArchived,true);
    assert.equal((await listTursoMenus(db,'public'))[0].id,created.id);
    assert.equal(sqlite.prepare('SELECT count(*) n FROM menus').get().n,1);
    assert.equal(sqlite.prepare('SELECT count(*) n FROM menu_operations').get().n,4);
  }finally{sqlite.close()}
});
test('activating missing menu never deactivates the current selection',async()=>{
  const {db,sqlite}=fixture();
  try{
    const a=await createTursoMenu(db,{...menu,isActive:true});
    assert.equal(await activateTursoMenu(db,'missing'),null);
    assert.equal((await listTursoMenus(db,'active'))[0].id,a.id);
    const b=await createTursoMenu(db,{...menu,title:'Second',isActive:true});
    assert.deepEqual((await listTursoMenus(db,'active')).map(x=>x.id),[b.id]);
    assert.equal((await getTursoMenuById(db,a.id)).isActive,false);
    assert.equal(sqlite.prepare('SELECT count(*) n FROM menu_operations WHERE menu_id=?').get(a.id).n,2);
  }finally{sqlite.close()}
});
test('audit or child failure rolls back all publication and menu changes',async()=>{
  const {db,sqlite,inject}=fixture();
  try{
    const a=await createTursoMenu(db,{...menu,isActive:true});
    const b=await createTursoMenu(db,{...menu,title:'Second'});
    inject(sql=>{if(sql.startsWith('INSERT INTO menu_operations'))throw Error('AUDIT_UNAVAILABLE')});
    await assert.rejects(activateTursoMenu(db,b.id),/AUDIT_UNAVAILABLE/);
    assert.deepEqual((await listTursoMenus(db,'active')).map(x=>x.id),[a.id]);
    inject(sql=>{if(sql.startsWith('INSERT INTO menu_products'))throw Error('CHILD_WRITE_FAILED')});
    await assert.rejects(updateTursoMenu(db,b.id,{title:'Must Roll Back',linkedProducts:['new']}),/CHILD_WRITE_FAILED/);
    assert.equal((await getTursoMenuById(db,b.id)).title,'Second');
    assert.deepEqual((await getTursoMenuById(db,b.id)).linkedProducts,['old-product']);
  }finally{sqlite.close()}
});
test('invalid weeks, unrecognized edits and unresolved markets cannot commit',async()=>{
  const {db,sqlite}=fixture();
  try{
    await assert.rejects(createTursoMenu(db,{...menu,weekEnd:menu.weekStart}),/WEEK_RANGE_INVALID/);
    await assert.rejects(createTursoMenu(db,{...menu,imageUrl:'javascript:alert(1)'}),/IMAGE_URL_INVALID/);
    await assert.rejects(createTursoMenu(db,{...menu,isActive:'true'}),/FLAG_INVALID/);
    await assert.rejects(createTursoMenu(db,{...menu,isActive:true,isArchived:true}),/ARCHIVED_CANNOT_ACTIVATE/);
    await assert.rejects(createTursoMenu(db,{...menu,marketId:'unmigrated-market'}),/FOREIGN KEY/);
    await assert.rejects(createTursoMenu(db,{...menu,id:'replacement'}),/FIELD_NOT_EDITABLE/);
    assert.equal(sqlite.prepare('SELECT count(*) n FROM menus').get().n,0);
    assert.equal(sqlite.prepare('SELECT count(*) n FROM menu_operations').get().n,0);
  }finally{sqlite.close()}
});
test('stale database update is rejected with its child and audit mutations rolled back',async()=>{
  const {db,sqlite,inject}=fixture();
  try{
    const a=await createTursoMenu(db,menu);
    inject(sql=>{
      if(sql.startsWith('UPDATE menus SET title=')||sql.startsWith('UPDATE menus SET market_id='))
        sqlite.prepare('UPDATE menus SET updated_at=? WHERE id=?').run('2099-01-01T00:00:00Z',a.id);
    });
    await assert.rejects(updateTursoMenu(db,a.id,{title:'Conflict'}),/CONCURRENT_MODIFICATION/);
    assert.equal((await getTursoMenuById(db,a.id)).title,menu.title);
    assert.equal(sqlite.prepare('SELECT count(*) n FROM menu_operations').get().n,1);
  }finally{sqlite.close()}
});
