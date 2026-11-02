import test from 'node:test';
import assert from 'node:assert/strict';
import {auditCatalogAuthority} from '../../lib/catalog/square-catalog-authority-audit.mjs';
test('misnamed Square ID blocks migration approval instead of silently overwriting the catalog',()=>{
 const source=[{squareId:'shared-1',name:'Pineapple Mango Lemonade',priceCents:1199}];
 const cache=[{squareId:'shared-1',name:'Vitamin Sea',priceCents:1199}];
 const result=auditCatalogAuthority(source,cache);
 assert.equal(result.releaseSafe,false);
 assert.equal(result.identityConflicts.length,1);
 assert.equal(result.providerReadbackCertified,false);
});
test('square-only legacy products are reported without auto-activating them',()=>{
 const u=[{squareId:'p1',name:'Strawberry Bliss',priceCents:1199}];
 const cache=[{squareId:'p1',name:'Strawberry Bliss'},{squareId:'p2',name:'Black Sesame'}];
 const audit=auditCatalogAuthority(u,cache);
 assert.equal(audit.squareOnly.length,1);
 assert.equal(audit.unifiedCount,1);
 assert.equal(audit.releaseSafe,true);
 assert.equal(audit.providerReadbackCertified,false);
});
test('different stated cents or missing canonical item identity blocks release',()=>{
 const audit=auditCatalogAuthority([{squareId:'p1',name:'Bliss',priceCents:1199},{squareId:'p2',name:'Blue Lotus'}],
  [{squareId:'p1',name:'Bliss',priceCents:1000}]);
 assert.equal(audit.releaseSafe,false);
 assert.equal(audit.priceConflicts.length,1);
 assert.equal(audit.unifiedOnly.length,1);
});
test('duplicate Square IDs in either snapshot fail closed',()=>{
 const audit=auditCatalogAuthority([{id:'p1',name:'A'},{id:'p1',name:'B'}],[{id:'p1',name:'A'}]);
 assert.equal(audit.releaseSafe,false);assert.equal(audit.duplicateOrInvalidIds.length,1);
});
