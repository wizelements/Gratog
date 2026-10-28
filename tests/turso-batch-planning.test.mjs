import test from 'node:test';
import assert from 'node:assert/strict';
import {APPROVED_LEMONADE_OFFERS,planFourGallonEquivalent,buildWeeklyBatchPlan,
  allocateFinishedBottles} from '../lib/preorder/turso-batch-planning.mjs';
const sat='2026-10-31';
const selected=APPROVED_LEMONADE_OFFERS.slice(0,4).map(({productId,variationId})=>({productId,variationId,gallons:4}));
test('4 gallons means 32 bottles and only 16 planned preorders',()=>{
  assert.deepEqual(planFourGallonEquivalent(4),{
    gallons:4,theoreticalBottles:32,preorderCap:16,marketTarget:12,
    uncertaintyBuffer:4,actualBottles:null,physicalStockVerified:false,checkoutEnabled:false});
});
test('8 gallons doubles planning quantities without asserting physical stock',()=>{
  assert.equal(planFourGallonEquivalent(8).preorderCap,32);
  assert.equal(planFourGallonEquivalent(8).physicalStockVerified,false);
});
test('4 planned flavors gives 64 preorder maximum, no checkout authority',()=>{
  const result=buildWeeklyBatchPlan({pickupDate:sat,flavors:selected});
  assert.equal(result.proposedPreorderCap,64);
  assert.equal(result.theoreticalBottles,128);
  assert.equal(result.checkoutEnabled,false);
});
test('5 selected flavors gives 80 cap, no sixth unplanned flavor',()=>{
  const result=buildWeeklyBatchPlan({pickupDate:sat,flavors:[...selected,
    {...APPROVED_LEMONADE_OFFERS[4],gallons:4}]});
  assert.equal(result.proposedPreorderCap,80);assert.equal(result.rows.length,5);
});
test('reject duplicate, 6 flavors, unknown Square identity and wrong date',()=>{
  const plan=flavors=>buildWeeklyBatchPlan({pickupDate:sat,flavors});
  assert.throws(()=>plan([...selected,selected[0]]),/DUPLICATE_FLAVOR/);
  assert.throws(()=>plan(APPROVED_LEMONADE_OFFERS.map(x=>({...x,gallons:4}))),/SELECT_4_OR_5_FLAVORS/);
  assert.throws(()=>plan([...selected.slice(0,3),{productId:'fake',gallons:4}]),/UNAPPROVED_SQUARE_VARIATION/);
  assert.throws(()=>buildWeeklyBatchPlan({pickupDate:'2026-10-30',flavors:selected}),/SATURDAY_PICKUP_DATE_REQUIRED/);
});
test('never silently allow arbitrary quantities or treat plan as inventory',()=>{
  for(const gallons of [0,3,5,7,12,NaN,4.5])assert.throws(()=>planFourGallonEquivalent(gallons));
  assert.deepEqual(allocateFinishedBottles({actualBottles:29,committedPreorders:16}),
    {actualBottles:29,committedPreorders:16,shortfall:0,marketAllocation:11,buffer:2});
  assert.equal(allocateFinishedBottles({actualBottles:12,committedPreorders:16}).shortfall,4);
});
