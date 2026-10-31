import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  validatedRequest, verifiedSquareTextUsPage, OrderRequestValidationError,
} from '@/lib/commerce/nonmarket-order-request';

const valid = {
  requestId:'a38235bd-103f-4d7b-a01c-75ca54df253c',
  items:[{slug:'calm-waters',quantity:2},{slug:'herbal-vibe',quantity:1}],
  customer:{name:'Test Customer',email:'buyer@example.test'},
  fulfillmentType:'delivery',
  address:{street:'123 Sample Street',city:'Atlanta',state:'GA',zip:'30315'},
  deliveryTimeSlot:'12-15',
  preorderAcknowledged:true,confirmedFulfillment:true,preorderTermsVersion:'2026-10-31',
};

function rejects(x:any, code:string) {
  try { validatedRequest(x); throw new Error('DID_NOT_REJECT'); }
  catch(e) {
    if (e instanceof OrderRequestValidationError) expect(e.code).toBe(code);
    else throw e;
  }
}

describe('Nonmarket Square Messages request: server-owned invariants', () => {
  it('server-prices mixed-item cart and never creates a payment', () => {
    const r=validatedRequest({...valid,items:valid.items.map(item=>({...item,priceCents:1,price:0.01}))});
    expect(r.items.map(i=>i.unitPriceCents)).toEqual([1199,1599]);
    expect(r.merchandiseTotalCents).toBe(3997);
    expect(r.capacityReserved).toBe(false);
    expect(r.paymentStatus).toBe('not_charged');
    expect('squarePaymentId' in r).toBe(false);
  });
  it('retired boba shots tea, unknown, and unapproved flavors cannot be purchased', () => {
    for(const slug of ['peach-lemonade','blue-lotus','boba','sweet-potato-chai','strawberry-bliss']) {
      rejects({...valid,items:[{slug,quantity:1}]},'ITEM_NOT_APPROVED');
    }
  });
  it('requires explicit confirmation and prevents hidden category substitutions',()=>{
    rejects({...valid,preorderAcknowledged:false},'ACKNOWLEDGEMENT_REQUIRED');
    rejects({...valid,confirmedFulfillment:false},'ACKNOWLEDGEMENT_REQUIRED');
    rejects({...valid,fulfillmentType:'pickup_market'},'FULFILLMENT_REQUIRED');
    rejects({...valid,items:[{slug:'calm-waters',quantity:1},{slug:'calm-waters',quantity:2}]},'DUPLICATE_ITEM');
    rejects({...valid,items:[{slug:'calm-waters',quantity:0}]},'INVALID_QUANTITY');
  });
  it('allows Browns Mill Monday requests but not market or Tuesday pickup',()=>{
    const pickup={...valid,fulfillmentType:'pickup',address:undefined,deliveryTimeSlot:undefined,
      pickup:{locationId:'browns-mill',date:'2026-11-02'}};
    expect(validatedRequest(pickup).fulfillmentType).toBe('pickup');
    rejects({...pickup,pickup:{locationId:'serenbe',date:'2026-11-02'}},'MARKET_FLOW_REQUIRED');
    rejects({...pickup,pickup:{locationId:'browns-mill',date:'2026-11-03'}},'PICKUP_DAY_REQUIRED');
  });
  it('allows only Georgia destination review and avoids false shipping prices',()=>{
    expect(validatedRequest({...valid,fulfillmentType:'shipping'}).shippingMethod).toBe('merchant_quote_pending');
    rejects({...valid,address:{...valid.address,state:'FL'}},'GEORGIA_ONLY');
    rejects({...valid,deliveryTimeSlot:''},'DELIVERY_WINDOW_REQUIRED');
  });
  it('only accepts HTTPS Square-hosted contact pages; no speculative messaging link',()=>{
    expect(verifiedSquareTextUsPage('https://tasteofgratitude.square.site')).toContain('square.site');
    for(const url of ['https://evil.com','http://tasteofgratitude.square.site',
      'https://square.site.evil.com','https://square.site@evil.com',
      'https://squareup.com.evil.com']) {
      expect(verifiedSquareTextUsPage(url)).toBeNull();
    }
    expect(verifiedSquareTextUsPage(undefined)).toBeNull();
  });
  it('merchant requests inbox is authorized and cannot mark an unpaid request paid',()=>{
    const route=readFileSync('app/api/admin/nonmarket-order-requests/route.ts','utf8');
    const page=readFileSync('app/admin/nonmarket-orders/page.tsx','utf8');
    expect(route).toContain('withAdminMiddleware');
    expect(route).toContain('PERMISSIONS.ORDERS_VIEW');
    expect(route).toContain('PERMISSIONS.ORDERS_UPDATE_STATUS');
    expect(route).toContain('STATUS_REQUIRES_PAYMENT_VERIFICATION');
    expect(route).not.toContain('createPayment(');
    expect(page).toContain('customerContact?.email?.status');
    expect(page).toContain('No');
  });
  it('site checkout uses no-charge request API and cannot auto-charge a nonmarket cart',()=>{
    const root=readFileSync('components/checkout/CheckoutRoot.tsx','utf8');
    const form=readFileSync('components/checkout/SquareMessagesReview.tsx','utf8');
    const route=readFileSync('app/api/order-requests/route.ts','utf8');
    expect(root).toContain('<SquareMessagesReview');
    expect(root).not.toContain('<ReviewAndPay');
    expect(form).toContain("fetch('/api/order-requests'");
    expect(form).not.toContain('SquarePaymentForm');
    expect(route).not.toContain('createPayment(');
    expect(route).not.toContain('createSquareOrder(');
  });
});
