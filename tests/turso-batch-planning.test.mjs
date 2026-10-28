import test from 'node:test';
import assert from 'node:assert/strict';
import {APPROVED_LEMONADE_OFFERS,planFourGallonEquivalent,buildWeeklyBatchPlan,
  allocateFinishedBottles} from '../lib/preorder/turso-batch-planning.mjs';
const sat='2026-10-31';
const selected=APPROVED_LEMONADE_OFFERS.map(({productId,variationId})=>({productId,variationId,gallons:4}));
test('4 gallons means 32 theoretical bottles and only 16 planned preorders',()=>{
  assert.deepEqual(planFourGallonEquivalent(4),{
    gallons:4,theoreticalBottles:32,preorderCap:16,marketTarget:12,
    uncertaintyBuffer:4,actualBottles:null,physicalStockVerified:false,checkoutEnabled:false});
});
test('8 gallons doubles theoretical output, but never asserts physical stock',()=>{
  assert.equal(planFourGallonEquivalent(8).preorderCap,32);
  assert.equal(planFourGallonEquivalent(8).physicalStockVerified,false);
});
test('six existing flavors are planned with six 4-gallon slots and 96 preorder capacity',()=>{
  const result=buildWeeklyBatchPlan({pickupDate:sat,flavors:selected});
  assert.equal(result.flavorCount,6);
  assert.equal(result.containerSlots,6);
  assert.equal(result.gallons,24);
  assert.equal(result.theoreticalBottles,192);
  assert.equal(result.proposedPreorderCap,96);
  assert.equal(result.rows.reduce((n,row)=>n+row.marketTarget,0),72);
  assert.equal(result.physicalStockVerified,false);
  assert.equal(result.checkoutEnabled,false);
  assert.ok(result.rows.every(row=>row.checkoutEnabled===false&&row.reservationEngineCertified===false));
});
test('reject fewer than six current flavors, duplicates and extra/unapproved Square IDs',()=>{
  const plan=flavors=>buildWeeklyBatchPlan({pickupDate:sat,flavors});
  assert.throws(()=>plan(selected.slice(0,5)),/SELECT_ALL_SIX_CURRENT_FLAVORS/);
  assert.throws(()=>plan([...selected.slice(0,5),selected[0]]),/DUPLICATE_FLAVOR/);
  assert.throws(()=>plan([...selected.slice(0,5),{productId:'fake',gallons:4}]),/UNAPPROVED_SQUARE_VARIATION/);
  assert.throws(()=>plan([...selected,{productId:'seventh',gallons:4}]),/SELECT_ALL_SIX_CURRENT_FLAVORS/);
  assert.throws(()=>plan([...selected.slice(0,5),{...selected[5],variationId:'wrong'}]),/UNAPPROVED_SQUARE_VARIATION/);
});
test('six slots prevent an 8-gallon plan before an increased capacity is approved',()=>{
  const doubled=selected.map((row,i)=>i===0?{...row,gallons:8}:row);
  assert.throws(()=>buildWeeklyBatchPlan({pickupDate:sat,flavors:doubled}),
    /WEEKLY_CONTAINER_CAPACITY_EXCEEDED/);
});
test('Saturday ISO date and sound planning quantities are mandatory',()=>{
  assert.throws(()=>buildWeeklyBatchPlan({pickupDate:'2026-10-30',flavors:selected}),
    /SATURDAY_PICKUP_DATE_REQUIRED/);
  assert.throws(()=>buildWeeklyBatchPlan({pickupDate:'2026-02-30',flavors:selected}),
    /SATURDAY_PICKUP_DATE_REQUIRED/);
  for(const gallons of [0,3,5,7,12,NaN,4.5])assert.throws(()=>planFourGallonEquivalent(gallons));
});
test('finished bottle allocations are based only on actual physical counts',()=>{
  assert.deepEqual(allocateFinishedBottles({actualBottles:29,committedPreorders:16}),
    {actualBottles:29,committedPreorders:16,shortfall:0,marketAllocation:11,buffer:2});
  assert.equal(allocateFinishedBottles({actualBottles:12,committedPreorders:16}).shortfall,4);
});
