import test from 'node:test';
import assert from 'node:assert/strict';
import {collectIndexableStorefrontProducts} from '../../lib/seo-product-sitemap.mjs';

test('only indexable storefront products, never archived or removed Square rows', () => {
  const rows = collectIndexableStorefrontProducts({success:true,products:[
    {id:'sale-id',slug:'sale-slug',name:'Current',checkoutReady:true},
    {id:'sold-out',name:'Sold out but valid',checkoutReady:false},
    {id:'archived',name:'Legacy',squareIsArchived:true},
    {id:'archived-title',name:'Legacy page',seoTitle:'Archived Product'},
    {id:'no-longer-offered',name:'Removed',available:false},
    {id:'hidden',name:'Old',isArchived:true},
    {id:'slashed',slug:'../../junk',name:'Not a safe URL'},
    {id:'sale-id',slug:'sale-slug',name:'Duplicate'}
  ]});
  assert.deepEqual(rows.map(x=>x.reference),['sale-slug','sold-out']);
});
test('deny incomplete upstream responses and untrusted slugs',()=>{
  assert.deepEqual(collectIndexableStorefrontProducts({success:false,products:[{id:'a',name:'A'}]}),[]);
  assert.deepEqual(collectIndexableStorefrontProducts({data:[{id:'a',name:'A'}]}),[]);
  assert.deepEqual(collectIndexableStorefrontProducts({success:true,products:[{id:'a',slug:'%2Fadmin',name:'A'}]}),[]);
});