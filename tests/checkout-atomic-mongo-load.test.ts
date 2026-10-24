/** Live ACID Mongo replica-set deduplication contract, isolated GitHub CI only. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { withAtomicIdempotencyClaim } from '@/lib/idempotency';

const URI=process.env.PREORDER_TEST_MONGO_URI;
const suite=URI?describe:describe.skip;
suite('real Mongo checkout idempotency concurrency',()=>{
  let client:MongoClient, db:any;
  const fingerprint='c'.repeat(64);
  beforeAll(async()=>{
    client=new MongoClient(URI!,{maxPoolSize:50});
    await client.connect();
    db=client.db('tog_idem_cert_'+randomUUID().replaceAll('-',''));
  },20000);
  afterAll(async()=>{if(client){await db.dropDatabase();await client.close()}},20000);
  it('1,000 overlapping identical checkout requests execute one database order insertion',async()=>{
    const claimId=randomUUID();
    let actualCreates=0;
    const op=async()=>{
      actualCreates++;
      await db.collection('orders').insertOne({id:'single-order',createdAt:new Date()});
      // Delay completion to force duplicates to observe in-progress claim.
      await new Promise(r=>setTimeout(r,50));
      return {success:true,id:'single-order'};
    };
    const started=Date.now();
    const results=await Promise.allSettled(Array.from({length:1000},()=>
      withAtomicIdempotencyClaim(db.collection('idempotency_keys'),claimId,op,86400,fingerprint)
    ));
    const admitted=results.filter(x=>x.status==='fulfilled');
    const rejected=results.filter(x=>x.status==='rejected');
    const unexpected=rejected.filter(x=>(x as PromiseRejectedResult).reason?.code!=='ORDER_ALREADY_PROCESSING');
    const count=await db.collection('orders').countDocuments({});
    const replay=await withAtomicIdempotencyClaim(db.collection('idempotency_keys'),claimId,
      async()=>{throw new Error('must never duplicate')},86400,fingerprint);
    console.log('CHECKOUT_ATOMIC_REAL_MONGO_LOAD',JSON.stringify({
      attempted:1000,orderCreates:actualCreates,orders:count,replayId:replay.id,
      accepted:admitted.length,processingOrRejected:rejected.length,
      unexpected:unexpected.length,wallMs:Date.now()-started,
    }));
    expect(actualCreates).toBe(1);
    expect(count).toBe(1);
    expect(replay).toEqual({success:true,id:'single-order'});
    expect(unexpected).toHaveLength(0);
  },60000);
});
