import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { stockAdmission, reserveMarketItems } from '@/lib/commerce/market-stock-reservations';

const now=new Date('2026-10-31T18:00:00.000Z');
const good={
  _id:'serenbe:2026-10-31:calm-waters',
  marketId:'serenbe',serviceDate:'2026-10-31',
  slug:'calm-waters',squareVariationId:'VAR_1',squareLocationId:'SQUARE_LOC',
  approvedUnits:10,heldUnits:2,soldUnits:1,
  merchantApprovedAt:new Date(now.getTime()-30_000),
  squareObservedAt:new Date(now.getTime()-10_000),
  verifiedSquareOnHand:9,
  merchantPhysicalCountVerified:true,
  separatelyAllocatedFromOtherChannels:true,
  paymentCertification:'verified' as const,
  sessionStatus:'open' as const,
  priceCents:1199,
};
const square={slug:'calm-waters',variationId:'VAR_1',status:'found',countStatus:'reported',onHand:9};

describe('Market inventory reconciliation + stock reservations',()=>{
  it('never invents availability without market ledger and Square readback',()=>{
    expect(stockAdmission(null,square,1,now).ok).toBe(false);
    expect(stockAdmission(good,null,1,now).ok).toBe(false);
    expect(stockAdmission(good,{...square,countStatus:'unknown'},1,now).ok).toBe(false);
    expect(stockAdmission(good,{...square,onHand:-1},1,now).ok).toBe(false);
  });
  it('requires isolation, payment certification, valid Square SKU and fresh readback',()=>{
    expect(stockAdmission({...good,separatelyAllocatedFromOtherChannels:false},square,1,now).reason)
      .toBe('MARKET_ALLOCATION_NOT_ISOLATED');
    expect(stockAdmission({...good,paymentCertification:'not_verified'},square,1,now).reason)
      .toBe('SQUARE_PAYMENT_CERTIFICATION_REQUIRED');
    expect(stockAdmission({...good,squareVariationId:'OTHER'},square,1,now).reason)
      .toBe('SQUARE_VARIATION_COUNT_UNVERIFIED');
    expect(stockAdmission({...good,squareObservedAt:new Date(now.getTime()-10*60_000)},square,1,now).reason)
      .toBe('STOCK_CERTIFICATION_STALE');
  });
  it('never oversells local held+sold stock or diverged Square count',()=>{
    expect(stockAdmission(good,square,8,now).reason).toBe('MARKET_STOCK_NOT_AVAILABLE');
    expect(stockAdmission(good,square,6,now).remaining).toBe(7);
    expect(stockAdmission(good,{...square,onHand:4},1,now).reason).toBe('MARKET_SQUARE_COUNTS_DIVERGED');
  });
  it('requires paid-order real provider certification before admitting a hold',async()=>{
    const prior=process.env.MARKET_QR_CHECKOUT_RELEASE_CERTIFIED;
    delete process.env.MARKET_QR_CHECKOUT_RELEASE_CERTIFIED;
    try {
      await expect(reserveMarketItems({db:null,client:null,marketId:'serenbe',
        serviceDate:'2026-10-31',items:[{slug:'calm-waters',quantity:1}],
        requestId:'d742e382-d582-4278-8718-76a3bf00f493',squareRows:[square],now}))
        .rejects.toThrow('MARKET_CHECKOUT_NOT_CERTIFIED');
    }finally{
      if(prior===undefined)delete process.env.MARKET_QR_CHECKOUT_RELEASE_CERTIFIED;
      else process.env.MARKET_QR_CHECKOUT_RELEASE_CERTIFIED=prior;
    }
  });
  it('never turns an admin physical recount into a payable order',()=>{
    const route=readFileSync('app/api/admin/market-stock/reconcile/route.ts','utf8');
    expect(route).toContain('PERMISSIONS.INVENTORY_ADJUST');
    expect(route).toContain("separatelyAllocatedFromOtherChannels:false");
    expect(route).toContain("paymentCertification:'not_verified'");
    expect(route).toContain("sessionStatus:'unpublished'");
    expect(route).not.toContain('createPayment(');
  });
});
