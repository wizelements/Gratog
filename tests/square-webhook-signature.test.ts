import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifySquareWebhookHmac } from '@/lib/square/webhook-signature';
const url='https://tasteofgratitude.shop/api/webhooks/square';
const secret='sandbox-signature-key-not-real';
const event=JSON.stringify({id:'evt_test-1000',type:'payment.updated',data:{object:{payment:{status:'COMPLETED'}}}});
const sign=(u:string,b:string)=>createHmac('sha256',secret).update(u+b).digest('base64');
describe('Square signed webhook payload routing',()=>{
  it('accepts exact URL/body signed notification only',()=>{
    const hmac=sign(url,event);
    expect(verifySquareWebhookHmac(hmac,url,event,secret)).toBe(true);
    expect(verifySquareWebhookHmac(hmac,url,event+' ',secret)).toBe(false);
    expect(verifySquareWebhookHmac(hmac,url+'?attacker=1',event,secret)).toBe(false);
    expect(verifySquareWebhookHmac(hmac,'https://wrong.example/api/webhooks/square',event,secret)).toBe(false);
    expect(verifySquareWebhookHmac(hmac,url,event,'wrong-secret')).toBe(false);
    expect(verifySquareWebhookHmac('',url,event,secret)).toBe(false);
    expect(verifySquareWebhookHmac('invalid!',url,event,secret)).toBe(false);
  });
});
