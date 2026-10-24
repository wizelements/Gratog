import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';

const mocks = vi.hoisted(() => {
  let docs = new Map<string, any>();
  const collection = {
    findOne: vi.fn(async ({key}: {key:string}) => [...docs.values()].find(x=>x.key===key)||null),
    insertOne: vi.fn(async (row: any) => {
      if (docs.has(row._id)) throw Object.assign(new Error('duplicate'),{code:11000});
      docs.set(row._id,{...row});
      return {insertedId:row._id};
    }),
    updateOne: vi.fn(async (filter: any,update:any) => {
      const row=docs.get(filter._id);
      if(!row || row.status!==filter.status)return {modifiedCount:0};
      Object.assign(row,update.$set);
      return {modifiedCount:1};
    }),
  };
  return {collection,clear:()=>docs.clear()};
});
import { withAtomicIdempotencyClaim, IdempotencyAdmissionError } from '@/lib/idempotency';

const fingerprint='a'.repeat(64);
afterEach(()=>{mocks.clear();vi.clearAllMocks()});
describe('durable order idempotency claim',()=>{
  it('admits exactly one operation across 100 simultaneous identical request IDs',async()=>{
    const key=randomUUID();
    let executed=0;
    const runs=await Promise.allSettled(Array.from({length:100},()=>
      withAtomicIdempotencyClaim(mocks.collection,key,async()=>{executed++;await new Promise(r=>setTimeout(r,20));return {success:true,id:'order-1'}},86400,fingerprint)
    ));
    expect(executed).toBe(1);
    expect(runs.filter(x=>x.status==='fulfilled').length).toBeGreaterThanOrEqual(1);
    const errors=runs.filter(x=>x.status==='rejected').map(x=>(x as PromiseRejectedResult).reason);
    expect(errors.every(e=>e?.code==='ORDER_ALREADY_PROCESSING')).toBe(true);
    const replay=await withAtomicIdempotencyClaim(mocks.collection,key,async()=>{throw Error('duplicate execution')},86400,fingerprint);
    expect(replay).toEqual({success:true,id:'order-1'});
  });
  it('rejects a changed payload even when an ID has a completed order',async()=>{
    const key=randomUUID();
    await withAtomicIdempotencyClaim(mocks.collection,key,async()=>({success:true,id:'order-1'}),86400,fingerprint);
    await expect(withAtomicIdempotencyClaim(mocks.collection,key,async()=>({success:true}),86400,'b'.repeat(64)))
      .rejects.toMatchObject({code:'IDEMPOTENCY_CONFLICT'});
  });
  it('keeps ambiguous operations locked rather than creating a second order',async()=>{
    const key=randomUUID();
    await expect(withAtomicIdempotencyClaim(mocks.collection,key,async()=>{throw Error('transient failure')},86400,fingerprint)).rejects.toThrow();
    await expect(withAtomicIdempotencyClaim(mocks.collection,key,async()=>({success:true}),86400,fingerprint))
      .rejects.toMatchObject({code:'ORDER_ALREADY_PROCESSING'});
  });
});
