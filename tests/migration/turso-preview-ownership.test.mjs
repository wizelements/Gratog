import {test} from 'node:test';
import assert from 'node:assert/strict';
import {belongsToCurrentPreviewDatabase as owned} from '../../lib/checkout/turso-preview-ownership.mjs';
const order={id:'provider-order',reference_id:'local-order',metadata:{turso_certification_database:'gratog-migration-cert-20261018'}};
test('Sandbox events belong to the new staging database only with an exact provider order epoch and reference',()=>{
 assert.equal(owned(order),true);
 for(const changed of [null,{}, {...order,metadata:{}},{...order,reference_id:''},{...order,id:null},
  {...order,metadata:{turso_certification_database:'gratog-migration-cert-20261017'}},
  {...order,metadata:{turso_certification_database:'production'}}])assert.equal(owned(changed),false);
});
