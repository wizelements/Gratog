import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformDocument} from '../../scripts/migrate/transformers.mjs';
import {getTursoActiveMarkets,projectTursoMarket,TursoMarketParityError} from '../../lib/markets/turso-markets.mjs';

const date='2026-10-18T12:00:00.000Z';
const doc={_id:'507f1f77bcf86cd799439011',name:'Market',address:'123 Main St',
  city:'Atlanta',state:'GA',zip:'30303',lat:33.7,lng:-84.4,
  hours:'09:00-13:00',dayOfWeek:6,description:'Seasonal event',
  mapsUrl:'https://example.com',isActive:true,featured:true,
  createdAt:date,updatedAt:date};
const projected=doc=>{
  const result=transformDocument('markets',doc);
  assert.equal(result.statements.length,1);
  return result.statements[0].row;
};
test('migration keeps pickup schedule and operational fields rather than losing them',()=>{
  const row=projected({...doc,schedule:{repeat:'weekly',pickupDays:'stale'},pickupDays:'Sat',
    preorderCutoff:'Friday evening',parkingNotes:'South lot',recurrence:'first_third'});
  const schedule=JSON.parse(row.schedule_json);
  assert.deepEqual(schedule,{repeat:'weekly',pickupDays:'Sat',
    preorderCutoff:'Friday evening',parkingNotes:'South lot',recurrence:'first_third'});
  const m=projectTursoMarket(row);
  assert.equal(m.preorderCutoff,'Friday evening');
  assert.equal(m.parkingNotes,'South lot');
  assert.equal(m.recurrence,'first_third');
  assert.equal(m.lat,doc.lat);
  assert.equal(m.isActive,true);
});
test('legacy schedule with non-object values is retained without inventing data',()=>{
  assert.deepEqual(JSON.parse(projected({...doc,schedule:['Friday','Saturday']}).schedule_json),
    {legacySchedule:['Friday','Saturday']});
  assert.equal(projected(doc).schedule_json,null);
  assert.equal(JSON.parse(projected({...doc,pickupDays:'Saturday'}).schedule_json).pickupDays,'Saturday');
});
test('public Turso market feed uses SQL only, checks contract, does not silently lose rows',async()=>{
  let calls=0;
  const db={all:async sql=>{calls++;assert.match(sql,/FROM markets WHERE active=1/);
    return [projected({...doc,name:'A Market'}),projected({...doc,_id:'507f1f77bcf86cd799439012',name:'B Market'})];}};
  const result=await getTursoActiveMarkets(db);
  assert.equal(calls,1);assert.equal(result.length,2);
  assert.equal(result[1].name,'B Market');
});
test('bad JSON, missing coordinates, invalid flags, absent rows fail closed',async()=>{
  const row=projected(doc);
  assert.throws(()=>projectTursoMarket({...row,schedule_json:'{invalid'}),TursoMarketParityError);
  assert.throws(()=>projectTursoMarket({...row,latitude:null}),/COORDINATES_INVALID/);
  assert.throws(()=>projectTursoMarket({...row,active:2}),/ACTIVE_INVALID/);
  await assert.rejects(getTursoActiveMarkets({all:async()=>[row,{...row,id:'bad',longitude:null}]}),/COORDINATES_INVALID/);
  await assert.rejects(getTursoActiveMarkets({all:async()=>{throw Error('SQL_OFFLINE')}}),/SQL_OFFLINE/);
});
test('preview storefront market repository routes Turso first without Mongo fallback',()=>{
  const repo=readFileSync('lib/markets/repository.ts','utf8');
  const block=repo.match(/export async function getActiveMarkets\([^]*?\n\}/)?.[0];
  assert.ok(block);
  assert.match(block,/tursoPreviewSelected\(\)/);
  assert.match(block,/openTursoPreview\(\)/);
  assert.match(block,/getTursoActiveMarkets\(/);
  assert.ok(block.indexOf('tursoPreviewSelected()')<block.indexOf('connectToDatabase()'));
});
