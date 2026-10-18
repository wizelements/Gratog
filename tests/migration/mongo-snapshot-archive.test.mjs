import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {ObjectId,Long,Decimal128,Binary} from 'bson';
import {sealMongoSnapshot,openMongoSnapshot,documentSetDigest,canonicalBson} from '../../lib/checkout/mongo-snapshot-archive.mjs';
const document={_id:new ObjectId(),at:new Date(),amount:Long.fromString('9007199254740993'),exact:Decimal128.fromString('11.99'),bytes:new Binary(Buffer.from('private'))};
const fixture=()=>({format:'TOG_MONGO_SNAPSHOT_V1',database:'taste_of_gratitude',collections:[{name:'orders',documents:[document],digest:documentSetDigest([document]),indexes:[{key:{_id:1},name:'_id_'}]}]});
test('encrypted archive preserves exact BSON types and collection identity',()=>{
 const key=randomBytes(32),archive=sealMongoSnapshot(fixture(),key),decoded=openMongoSnapshot(archive,key);
 assert.equal(canonicalBson(decoded),canonicalBson(fixture()));assert.equal(archive.includes(Buffer.from('private')),false);
});
test('wrong key and modified ciphertext are rejected without a partial snapshot',()=>{
 const key=randomBytes(32),archive=sealMongoSnapshot(fixture(),key);
 assert.throws(()=>openMongoSnapshot(archive,randomBytes(32)),/INTEGRITY_FAILED/);
 const corrupt=Buffer.from(archive);corrupt[corrupt.length-1]^=1;
 assert.throws(()=>openMongoSnapshot(corrupt,key),/INTEGRITY_FAILED/);
});
test('authenticated archive still rejects a falsified document fingerprint',()=>{
 const key=randomBytes(32),data=fixture();data.collections[0].digest='0'.repeat(64);
 assert.throws(()=>openMongoSnapshot(sealMongoSnapshot(data,key),key),/INTEGRITY_FAILED/);
});
test('document-set fingerprints preserve numeric types and tolerate order only',()=>{
 assert.equal(documentSetDigest([{a:1,b:2},{c:3}]),documentSetDigest([{c:3},{b:2,a:1}]));
 assert.notEqual(documentSetDigest([{a:Long.fromString('1')}]),documentSetDigest([{a:1}]));
});
