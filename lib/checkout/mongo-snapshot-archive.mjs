import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {EJSON} from 'bson';
const magic=Buffer.from('TOG_MONGO_SNAPSHOT_V1\n');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?
 Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
export const canonicalBson=value=>JSON.stringify(canonical(EJSON.serialize(value,{relaxed:false})));
export const sha256=value=>createHash('sha256').update(value).digest('hex');
export function documentSetDigest(documents){
 return sha256(documents.map(document=>sha256(canonicalBson(document))).sort().join('\n'));
}
export function sealMongoSnapshot(snapshot,key){
 if(!Buffer.isBuffer(key)||key.length!==32)throw Error('SNAPSHOT_KEY_INVALID');
 const plain=gzipSync(Buffer.from(EJSON.stringify(snapshot,{relaxed:false}))),iv=randomBytes(12);
 const cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(magic);
 const encrypted=Buffer.concat([cipher.update(plain),cipher.final()]);
 return Buffer.concat([magic,iv,cipher.getAuthTag(),encrypted]);
}
export function openMongoSnapshot(archive,key){
 if(!Buffer.isBuffer(key)||key.length!==32||!Buffer.isBuffer(archive)||
    archive.length>100*1024*1024||!archive.subarray(0,magic.length).equals(magic))
   throw Error('SNAPSHOT_ARCHIVE_INVALID');
 try{
  const offset=magic.length,decipher=createDecipheriv('aes-256-gcm',key,archive.subarray(offset,offset+12));
  decipher.setAAD(magic);decipher.setAuthTag(archive.subarray(offset+12,offset+28));
  const compressed=Buffer.concat([decipher.update(archive.subarray(offset+28)),decipher.final()]);
  const data=EJSON.parse(gunzipSync(compressed,{maxOutputLength:100*1024*1024}).toString('utf8'),{relaxed:false});
  if(data.format!=='TOG_MONGO_SNAPSHOT_V1'||data.database!=='taste_of_gratitude'||!Array.isArray(data.collections))throw Error();
  for(const collection of data.collections){
   if(collection.digest!==documentSetDigest(collection.documents))throw Error();
  }
  return data;
 }catch{throw Error('SNAPSHOT_AUTHENTICATION_OR_INTEGRITY_FAILED')}
}
