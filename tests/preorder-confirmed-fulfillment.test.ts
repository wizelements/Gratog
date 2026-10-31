import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validatePreorderAcknowledgement, validateCheckoutFulfillment } from '@/lib/order-admission';
import { getPurchaseState } from '@/lib/purchase-status';

const read = (path:string) => readFileSync(resolve(process.cwd(),path),'utf8');
const items = [{name:'Melon Rita',quantity:1,isPreorder:true}];
const pickup = { fulfillmentType:'pickup_market', pickup:{locationId:'serenbe',date:'2026-11-07'},items };
const delivery = {fulfillmentType:'delivery',
  deliveryAddress:{street:'1 Example',city:'Atlanta',state:'GA',zip:'30331'},
  deliveryTimeSlot:'12:00-14:00',items};
const shipping = {fulfillmentType:'shipping',
  shippingAddress:{street:'1 Example',city:'Atlanta',state:'GA',zip:'30331'},
  shippingMethod:'verified-method',items};
const acknowledge = (x:Record<string,unknown>) => ({
  ...x, preorderAcknowledged:true,preorderTermsVersion:'2026-10-31',
});

describe('customer-confirmed future-batch preorders',()=>{
  it('blocks missing, stale, or false preorder acknowledgement',()=>{
    expect(validatePreorderAcknowledgement(pickup).code).toBe('PREORDER_ACKNOWLEDGEMENT_REQUIRED');
    expect(validatePreorderAcknowledgement({...pickup,preorderAcknowledged:false,preorderTermsVersion:'2026-10-31'}).valid).toBe(false);
    expect(validatePreorderAcknowledgement({...pickup,preorderAcknowledged:true,preorderTermsVersion:'old'}).valid).toBe(false);
  });
  it('permits pickup, delivery and shipping on explicit acknowledgement when details are complete',()=>{
    for(const input of [pickup,delivery,shipping]){
      expect(validateCheckoutFulfillment(input).valid).toBe(true);
      expect(validatePreorderAcknowledgement(acknowledge(input)).valid).toBe(true);
    }
  });
  it('still blocks missing location/date or delivery window even with consent',()=>{
    expect(validatePreorderAcknowledgement(acknowledge({...pickup,pickup:{locationId:''}})).code).toBe('PICKUP_DETAILS_REQUIRED');
    expect(validatePreorderAcknowledgement(acknowledge({...delivery,deliveryTimeSlot:''})).code).toBe('DELIVERY_WINDOW_REQUIRED');
  });
  it('does not require preorder consent for regular verified in-stock purchases',()=>{
    expect(validatePreorderAcknowledgement({...pickup,items:[{name:'Melon Rita',isPreorder:false}]}).valid).toBe(true);
  });
  it('never describes unknown physical inventory as in-stock',()=>{
    expect(getPurchaseState(null)).toMatchObject({stockStatus:'unknown',purchaseStatus:'check_availability',isPreorder:false});
    expect(getPurchaseState(null,true)).toMatchObject({stockStatus:'unknown',purchaseStatus:'preorder',isPreorder:true});
    expect(getPurchaseState(0,false).purchaseStatus).toBe('check_availability');
    expect(getPurchaseState(0,true).purchaseStatus).toBe('preorder');
    expect(getPurchaseState(4,true).purchaseStatus).toBe('in_stock');
  });
  it('enforces preorder terms in both persisted order creation and payment paths',()=>{
    const create=read('app/api/orders/create/route.js');
    const payment=read('app/api/payments/route.ts');
    const service=read('services/order.ts');
    const review=read('components/checkout/ReviewAndPay.tsx');
    expect(create).toContain('validatePreorderAcknowledgement({');
    expect(create).toContain('items: pricing.items,');
    expect(create).toContain('preorderAcknowledged: pricing.items.some');
    expect(payment).toContain('validatePreorderAcknowledgement(order)');
    expect(service).toContain("preorderTermsVersion: preorderAcknowledged === true ? '2026-10-31' : null");
    expect(review).toContain('checked={preorderAcknowledged}');
    expect(review).toContain('disabled={isCreatingOrder || !canProceedToPayment}');
    expect(review).not.toContain('Preorder items must be picked up at a selected market.');
  });
  it('accepts source-owned shipping restrictions but not blanket preorder-to-market-only rules',()=>{
    const source=read('app/api/orders/create/route.js');
    const cart=read('lib/cart-engine.ts');
    const pricing=read('lib/cart-pricing.ts');
    expect(source).toContain('basePricing.items.some((line) => line.marketExclusive)');
    expect(cart).not.toContain('Preorder items are only available for market pickup');
    expect(pricing).not.toContain('product.isPreorder || product.preorderOnly || item.isPreorder');
  });
  it('exposes a genuine, no-charge preorder-request path from unavailable approved product cards',()=>{
    const route=read('app/api/preorder-requests/route.ts');
    const page=read('app/preorder-request/page.tsx');
    const quick=read('components/QuickAddButton.jsx');
    const detail=read('app/product/[slug]/ProductDetailClient.jsx');
    expect(route).toContain('validateCheckoutFulfillment(order)');
    expect(route).toContain('validateGeorgiaDestination(address)');
    expect(route).toContain('merchant_capacity_and_schedule_confirmation');
    expect(route).toContain("paymentStatus: 'not_charged'");
    expect(route).not.toContain('createPayment(');
    expect(route).not.toContain('SQUARE_ACCESS_TOKEN');
    expect(page).toContain('/order-request');
    const unified=read('app/order-request/page.tsx');
    expect(unified).toContain('No charge is made now');
    expect(unified).toContain('confirmedFulfillment:consent');
    expect(quick).toContain('/order-request?product=');
    expect(detail).toContain('/order-request?product=');
  });
});
