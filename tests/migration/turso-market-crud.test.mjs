import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createTursoMarket,getTursoMarketById,getTursoActiveMarkets,getTursoAllMarkets,
  updateTursoMarket,archiveTursoMarket,TursoMarketParityError} from '../../lib/markets/turso-markets.mjs';

const source=readFileSync('db/migrations/0002_core_commerce.sql','utf8');
const ddl=source.match(/CREATE TABLE IF NOT EXISTS markets \([\s\S]*?\n\);/)?.[0];
assert.ok(ddl,'Exact production migration must include markets SQL schema');
const sample={name:'City Market',address:'123 Main St',city:'Atlanta',
  state:'GA',zip:'30303',lat:33.76,lng:-84.36,hours:'09:00-13:00',
  dayOfWeek:6,description:'Weekend neighborhood fresh market',mapsUrl:'https://example.org',
  pickupDays:'Saturdays',preorderCutoff:'Friday 3 PM',parkingNotes:'Park on side lot',
  recurrence:'weekly',isActive:true,featured:true};
const buildDb=()=>{
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON; '+ddl);
  sqlite.exec("CREATE TABLE historic_orders(id TEXT PRIMARY KEY,market_id TEXT REFERENCES markets(id) ON DELETE SET NULL)");
  let beforeWrite=()=>{};
  const db={
    get:async(sql,...args)=>sqlite.prepare(sql).get(...args),
    all:async(sql,...args)=>sqlite.prepare(sql).all(...args),
    run:async(sql,...args)=>{
      beforeWrite(sql,args);
      return sqlite.prepare(sql).run(...args);
    },
    interfere:fn=>{beforeWrite=fn},
    close:()=>sqlite.close(),
  };
  return {db,sqlite};
};
test('CREATE/read/edit/archive use exact SQL schema, never erase historic market ID',async()=>{
  const {db,sqlite}=buildDb();
  try {
    const created=await createTursoMarket(db,sample);
    assert.match(created.id,/^[a-f0-9]{24}$/);
    assert.equal(created.name,sample.name);
    assert.equal(created.pickupDays,'Saturdays');
    assert.equal((await getTursoAllMarkets(db)).length,1);
    assert.equal((await getTursoActiveMarkets(db)).length,1);
    sqlite.prepare('INSERT INTO historic_orders VALUES (?,?)').run('historical-1',created.id);
    const updated=await updateTursoMarket(db,created.id,{preorderCutoff:'Thursday noon',name:'New Market'});
    assert.equal(updated.name,'New Market');
    assert.equal(updated.pickupDays,'Saturdays');
    assert.equal(updated.parkingNotes,'Park on side lot');
    assert.equal(updated.preorderCutoff,'Thursday noon');
    assert.equal((await getTursoMarketById(db,created.id)).name,'New Market');
    assert.equal(await archiveTursoMarket(db,created.id),true);
    assert.equal(await archiveTursoMarket(db,created.id),true);
    assert.equal((await getTursoActiveMarkets(db)).length,0);
    assert.equal((await getTursoAllMarkets(db)).length,1);
    assert.equal(sqlite.prepare('SELECT market_id FROM historic_orders').get().market_id,created.id);
    assert.equal(await archiveTursoMarket(db,'not-existing'),false);
  } finally {db.close();}
});
test('unexpected fields and invalid data fail before SQL writes',async()=>{
  const {db}=buildDb();
  try {
    await assert.rejects(createTursoMarket(db,{...sample,name:''}),/NAME_MISSING/);
    await assert.rejects(createTursoMarket(db,{...sample,_id:'forged'}),/FIELD_NOT_EDITABLE/);
    const created=await createTursoMarket(db,sample);
    await assert.rejects(updateTursoMarket(db,created.id,{id:'forged'}),/FIELD_NOT_EDITABLE/);
    await assert.rejects(updateTursoMarket(db,created.id,{lat:999}),/COORDINATES_INVALID/);
    assert.equal((await getTursoMarketById(db,created.id)).lat,sample.lat);
    assert.equal(await updateTursoMarket(db,'absent',{name:'x'}),null);
  } finally {db.close();}
});
test('concurrent admin updates fail closed without overwriting another write',async()=>{
  const {db,sqlite}=buildDb();
  try {
    const created=await createTursoMarket(db,sample);
    let injected=false;
    db.interfere(sql=>{
      if(!injected && /^UPDATE markets SET/.test(sql)){
        injected=true;
        sqlite.prepare('UPDATE markets SET name=?,updated_at=? WHERE id=?')
          .run('External writer','2099-01-01T00:00:00.000Z',created.id);
      }
    });
    await assert.rejects(updateTursoMarket(db,created.id,{name:'Stale update'}),/CONCURRENT_MODIFICATION/);
    assert.equal((await getTursoMarketById(db,created.id)).name,'External writer');
  } finally {db.close();}
});
test('failed SQL connection and missing write confirmation never report success',async()=>{
  const {db,sqlite}=buildDb();
  try {
    const created=await createTursoMarket(db,sample);
    await assert.rejects(getTursoAllMarkets({all:async()=>{throw Error('SQL_DISCONNECTED')}}),/SQL_DISCONNECTED/);
    await assert.rejects(updateTursoMarket({
      get:db.get,run:async()=>({changes:undefined})},created.id,{name:'Wrong'}),
      /WRITE_CONFIRMATION_MISSING/);
    assert.equal(sqlite.prepare('SELECT name FROM markets').get().name,sample.name);
  } finally {db.close();}
});

test('repository API selects SQL before Mongo for all market operations',()=>{
  const code=readFileSync('lib/markets/repository.ts','utf8');
  const paths=[
    ['getAllMarkets','getTursoAllMarkets'],['getMarketById','getTursoMarketById'],
    ['createMarket','createTursoMarket'],['updateMarket','updateTursoMarket'],
    ['deleteMarket','archiveTursoMarket'],['getActiveMarkets','getTursoActiveMarkets']
  ];
  for(const [name,sqlFn] of paths) {
    const section=code.match(new RegExp('export async function '+name+'\\([^]*?\\n\\}'))?.[0];
    assert.ok(section,'Missing '+name);
    assert.match(section,/tursoPreviewSelected\(\)/);
    assert.ok(section.indexOf(sqlFn+'(')>=0,'Missing '+sqlFn);
    const firstOpen=section.indexOf('connectToDatabase()');
    assert.ok(firstOpen===-1 || section.indexOf(sqlFn+'(')<firstOpen,
      'Mongo opens before Turso routing: '+name);
  }
  const endpoint=readFileSync('app/api/admin/markets/route.ts','utf8');
  assert.match(endpoint,/Market archived successfully; historical order links preserved/);
});
