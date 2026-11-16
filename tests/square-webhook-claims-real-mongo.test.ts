import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { claimSquareWebhookEvent, finalizeSquareWebhookEvent } from '@/lib/square/webhook-claims';
const uri=process.env.PREORDER_TEST_MONGO_URI;
const suite=uri?describe:describe.skip;
suite('Square signed webhook real Mongo single-flight',()=>{
  let client:MongoClient,db:any;
  beforeAll(async()=>{
    client=new MongoClient(uri!,{maxPoolSize:48});
    await client.connect();
    db=client.db('tog_webhook_cert_'+randomUUID().replaceAll('-',''));
  },20000);
  afterAll(async()=>{if(client){await db.dropDatabase();await client.close()}},20000);
  it('1000 simultaneous event deliveries admit one processing worker',async()=>{
    const ledger=db.collection('square_webhook_claims');
    const claims=await Promise.all(Array.from({length:1000},()=>
      claimSquareWebhookEvent(ledger,'evt-unique-1000-12345678')));
    expect(claims.filter(x=>x==='claimed')).toHaveLength(1);
    expect(claims.filter(x=>x==='busy')).toHaveLength(999);
    await finalizeSquareWebhookEvent(ledger,'evt-unique-1000-12345678',true);
    expect(await claimSquareWebhookEvent(ledger,'evt-unique-1000-12345678')).toBe('duplicate');
    const found=await ledger.countDocuments({});
    console.log('SQUARE_WEBHOOK_REAL_MONGO_RESULT',
      JSON.stringify({attempted:1000,handled:1,deferred:999,records:found,success:true}));
    expect(found).toBe(1);
  },60000);
  it('partial side effect failure requires review, never blind replay',async()=>{
    const ledger=db.collection('square_webhook_claims');
    const id='evt-unknown-payment-1234';
    expect(await claimSquareWebhookEvent(ledger,id)).toBe('claimed');
    await finalizeSquareWebhookEvent(ledger,id,false);
    expect(await claimSquareWebhookEvent(ledger,id)).toBe('busy');
  });
});
