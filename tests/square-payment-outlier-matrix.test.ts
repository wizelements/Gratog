import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  createPayment, createPaymentLink, isDefinitiveSquarePaymentDecline,
  isDefinitiveSquareLinkFailure
} from '@/lib/square-api';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

type Case = {
  name: string; mode: 'success'|'decline'|'429'|'500'|'network'|'malformed'|'auth'|'link400';
  decline?: boolean; linkDefinitive?: boolean;
};

const paymentCases: Case[] = [
  {name:'Card captured',mode:'success'},
  {name:'Issuer CVV decline',mode:'decline',decline:true},
  {name:'Gateway throttle',mode:'429'},
  {name:'Square internal 500',mode:'500'},
  {name:'Square TCP timeout',mode:'network'},
  {name:'Unreadable HTTP 200 response',mode:'malformed'},
  {name:'Auth error not a decline',mode:'auth'},
];
const linkCases: Case[] = [
  {name:'Square checkout link created',mode:'success'},
  {name:'Explicit malformed link',mode:'link400',linkDefinitive:true},
  {name:'Provider throttle',mode:'429'},
  {name:'Provider internal error',mode:'500'},
  {name:'Lost provider response',mode:'network'},
  {name:'Unparseable success body',mode:'malformed'},
  {name:'Auth rejection',mode:'auth',linkDefinitive:true},
];
function respond(mode: Case['mode'], link: boolean) {
  if (mode==='network') return Promise.reject(new Error('synthetic ETIMEDOUT'));
  if (mode==='malformed') return Promise.resolve(new Response('not-json', {status:200}));
  if (mode==='success') return Promise.resolve(new Response(JSON.stringify(link
    ? {payment_link:{id:'pl-test',url:'https://square.link/u/test'}}
    : {payment:{id:'pay-test',status:'COMPLETED',amount_money:{amount:1199,currency:'USD'}}}),{status:200}));
  const status=mode==='429'?429:mode==='500'?500:mode==='auth'?401:400;
  const category=mode==='decline'?'PAYMENT_METHOD_ERROR':
    mode==='link400'?'INVALID_REQUEST_ERROR':
    mode==='429'?'RATE_LIMIT_ERROR':
    mode==='auth'?'AUTHENTICATION_ERROR':'API_ERROR';
  const code=mode==='decline'?'CVV_FAILURE':mode==='429'?'RATE_LIMITED':
    mode==='500'?'TEMPORARY_ERROR':mode==='auth'?'UNAUTHORIZED':'INVALID_VALUE';
  return Promise.resolve(new Response(JSON.stringify({errors:[{category,code,detail:'test-only'}]}),{status}));
}
describe('Square payment router deterministic outlier matrix', () => {
  for (const c of paymentCases) {
    it('classifies payment: '+c.name,async()=>{
      vi.stubEnv('SQUARE_ENVIRONMENT','sandbox');vi.stubEnv('SQUARE_ACCESS_TOKEN','test-only');
      vi.stubEnv('SQUARE_LOCATION_ID','test-location');
      vi.stubGlobal('fetch',vi.fn(()=>respond(c.mode,false)));
      const result=await createPayment({sourceId:'cnon:card-nonce-ok',amountCents:1199,idempotencyKey:'fixed-test-key'});
      expect(isDefinitiveSquarePaymentDecline(result)).toBe(c.decline===true);
      expect(result.success).toBe(c.mode==='success');
      if(['network','429','500','malformed'].includes(c.mode))expect(result.outcomeUnknown).toBe(true);
    });
  }
  for (const c of linkCases) {
    it('classifies preorder Square link: '+c.name,async()=>{
      vi.stubEnv('SQUARE_ENVIRONMENT','sandbox');vi.stubEnv('SQUARE_ACCESS_TOKEN','test-only');
      vi.stubEnv('SQUARE_LOCATION_ID','test-location');
      vi.stubGlobal('fetch',vi.fn(()=>respond(c.mode,true)));
      const result=await createPaymentLink({
        referenceId:'PRE-TEST',lineItems:[{name:'Test',quantity:'1',
          basePriceMoney:{amount:1199,currency:'USD'}}],idempotencyKey:'test-link-key'
      });
      expect(isDefinitiveSquareLinkFailure(result)).toBe(c.linkDefinitive===true);
      expect(result.success).toBe(c.mode==='success');
      if(['network','429','500','malformed'].includes(c.mode))expect(result.outcomeUnknown).toBe(true);
    });
  }
  it('routes 1000 synthetic payment results without classifying a timeout as a decline',async()=>{
    vi.stubEnv('SQUARE_ENVIRONMENT','sandbox');vi.stubEnv('SQUARE_ACCESS_TOKEN','test-only');
    vi.stubEnv('SQUARE_LOCATION_ID','test-location');
    let i=0;
    const modes:Case['mode'][]=['success','decline','429','500','network','malformed','auth'];
    vi.stubGlobal('fetch',vi.fn(()=>respond(modes[(i++)%modes.length],false)));
    const results=await Promise.all(Array.from({length:1000},(_,j)=>
      createPayment({sourceId:'cnon:card-nonce-ok',amountCents:1199,
        idempotencyKey:'scenario-'+j})));
    expect(results).toHaveLength(1000);
    expect(results.filter(r=>isDefinitiveSquarePaymentDecline(r)).length)
      .toBe(Array.from({length:1000},(_,j)=>modes[j % modes.length]).filter(m=>m==='decline').length);
    expect(results.filter(r=>r.outcomeUnknown).length).toBeGreaterThan(500);
  });
});
