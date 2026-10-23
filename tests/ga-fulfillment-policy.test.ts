import { describe, expect, it } from 'vitest';
import { pickupLocationSchema } from '@/lib/pickup-locations';
import { validateGeorgiaDestination } from '@/lib/georgia-orders';
import { shippingMethodKey } from '@/lib/shipping-service';
import fs from 'node:fs';

const baseLocation = {
  name: 'Community Pickup Desk', street: '100 Example Street',
  city: 'Atlanta', state: 'GA' as const, zip: '30331', instructions: '',
  windows: [{startsAt:'2026-11-01T15:00:00.000Z',endsAt:'2026-11-01T16:00:00.000Z',
    cutoffAt:'2026-10-31T15:00:00.000Z',capacity:5}]
};
describe('Georgia fulfillment safety', () => {
  it('accepts Georgia and blocks outside Georgia / conflicting addresses',()=>{
    expect(validateGeorgiaDestination({state:'GA',zip:'30331'}).valid).toBe(true);
    expect(validateGeorgiaDestination({state:'FL',zip:'30331'}).valid).toBe(false);
    expect(validateGeorgiaDestination({state:'GA',zip:'10001'}).valid).toBe(false);
    expect(validateGeorgiaDestination({state:'GA',zip:'30331',country:'CA'}).valid).toBe(false);
  });
  it('defaults nonmarket pickup to unpublished',()=>{
    expect(pickupLocationSchema.parse(baseLocation).isActive).toBe(false);
  });
  it('rejects invalid pickup windows and appointment count',()=>{
    const w=baseLocation.windows[0];
    expect(pickupLocationSchema.safeParse({...baseLocation,street:''}).success).toBe(false);
    expect(pickupLocationSchema.safeParse({...baseLocation,windows:[{...w,cutoffAt:w.startsAt}]}).success).toBe(false);
    expect(pickupLocationSchema.safeParse({...baseLocation,windows:[{...w,endsAt:'2026-11-01T14:00:00Z'}]}).success).toBe(false);
    expect(pickupLocationSchema.safeParse({...baseLocation,windows:[w,w]}).success).toBe(false);
    expect(pickupLocationSchema.safeParse({...baseLocation,windows:[{...w,capacity:0}]}).success).toBe(false);
  });
  it('carrier choice cannot encode customer price',()=>{
    expect(shippingMethodKey({carrier:'UPS',service:'Ground'})).toBe('ups::ground');
    expect(shippingMethodKey({carrier:'UPS',service:'Next Day'})).not.toBe('ups::ground');
  });
  it('never trusts client approval or shipping rates',()=>{
    const price=fs.readFileSync('lib/cart-pricing.ts','utf8');
    const create=fs.readFileSync('app/api/orders/create/route.js','utf8');
    const quote=fs.readFileSync('app/api/shipping/rates/route.ts','utf8');
    const shipping=fs.readFileSync('lib/shipping-service.ts','utf8');
    expect(price).toContain("product.shippingEligible === true && product.shippingTemperatureClass === 'ambient'");
    expect(create).toContain('PRODUCT_NOT_APPROVED_FOR_SHIPPING');
    expect(create).toContain('SHIPPING_QUOTE_EXPIRED');
    expect(quote).toContain('priceCart({ items, deliveryFeeCents: 0 })');
    expect(shipping).not.toContain('123 Wellness Way');
    expect(shipping).toContain('Mock tracking identifiers are not permitted.');
  });
});
