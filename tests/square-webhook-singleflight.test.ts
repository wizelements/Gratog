import { describe, expect, it } from 'vitest';
import { claimSquareWebhookEvent, finalizeSquareWebhookEvent } from '@/lib/square/webhook-claims';
function statefulClaims() {
  const rows=new Map<string,any>();
  const db={
    insertOne:async(d:any)=>{if(rows.has(d._id))throw Object.assign(new Error('duplicate'),{code:11000});rows.set(d._id,d)},
    findOne:async(f:any)=>rows.get(f._id)||null,
    updateOne:async(f:any,u:any)=>{const x=rows.get(f._id);if(!x||x.status!==f.status)return {modifiedCount:0};Object.assign(x,u.$set);return {modifiedCount:1}},
  };
  return {db};
}
describe('Square signed webhook delivery ledger',()=>{
  it('1000 simultaneous deliveries invoke one handler',async()=>{
    const {db}=statefulClaims();
    const attempts=await Promise.all(Array.from({length:1000},()=>
      claimSquareWebhookEvent(db,'square-event-123456789')));
    expect(attempts.filter(x=>x==='claimed')).toHaveLength(1);
    expect(attempts.filter(x=>x==='busy')).toHaveLength(999);
    await finalizeSquareWebhookEvent(db,'square-event-123456789',true);
    expect(await claimSquareWebhookEvent(db,'square-event-123456789')).toBe('duplicate');
  });
  it('uncertain partial effect does not silently replay',async()=>{
    const {db}=statefulClaims();
    expect(await claimSquareWebhookEvent(db,'square-event-abcdef123')).toBe('claimed');
    await finalizeSquareWebhookEvent(db,'square-event-abcdef123',false);
    expect(await claimSquareWebhookEvent(db,'square-event-abcdef123')).toBe('busy');
  });
  it('rejects missing and malformed event IDs',async()=>{
    const {db}=statefulClaims();
    await expect(claimSquareWebhookEvent(db,'unknown')).rejects.toThrow('INVALID_SQUARE_EVENT_ID');
  });
});
