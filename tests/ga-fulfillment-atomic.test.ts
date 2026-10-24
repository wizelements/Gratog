import { describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import { calculatePackageDimensions } from '@/lib/shipping-service';
import { pickupLocationSchema, reservePickupSlotInOrderTransaction, isUnpaidPickupLeaseCurrent } from '@/lib/pickup-locations';

// This unit test exercises the DB contract with a transaction-scoped fake.
// A real simultaneous-write conflict test still needs a live DB transaction.
describe('Nonmarket pickup transactional admission contract', () => {
  it('requires distinct staffing and address signoffs before publication',()=>{
    const data = {name:'Public Desk',street:'100 Public Avenue',city:'Atlanta',state:'GA',zip:'30331',isActive:true,
      windows:[]};
    expect(pickupLocationSchema.safeParse(data).success).toBe(false);
    expect(pickupLocationSchema.safeParse({...data,staffingConfirmed:true,addressVerified:true}).success).toBe(true);
  });
  it('requires confirmed staffing and address to admit any pickup', async () => {
    const locationId = new ObjectId().toString();
    const startsAt = new Date(Date.now() + 48 * 3600_000).toISOString();
    let filter: any;
    const db: any = { collection: (name: string) => ({
      findOneAndUpdate: async (f: any, _update: any, options: any) => {
        filter = f;
        expect(options.session).toBeDefined();
        return null;
      },
    }) };
    await expect(reservePickupSlotInOrderTransaction(db, {} as any, locationId, startsAt))
      .rejects.toThrow(/closed or not staffed/);
    expect(filter.addressVerified).toBe(true);
    expect(filter.staffingConfirmed).toBe(true);
    expect(filter.windows.$elemMatch.startsAt).toBe(startsAt);
  });
  it('rejects last-slot overflow without an order insert', async () => {
    const locationId = new ObjectId().toString();
    const startsAt = new Date(Date.now() + 48 * 3600_000).toISOString();
    const db: any = { collection: (name: string) =>
      name === 'orders' ? { countDocuments: async (_q: any, options: any) => {
        expect(options.session).toBeDefined();
        return 1;
      }} : { findOneAndUpdate: async () => ({
        windows: [{ startsAt, cutoffAt: new Date(Date.now()+24*3600_000).toISOString(), capacity: 1 }],
      }) } };
    await expect(reservePickupSlotInOrderTransaction(db, {} as any, locationId, startsAt))
      .rejects.toThrow(/just filled/);
  });
  it('requires physical parcel evidence and blocks unverified combined packs',()=>{
    expect(()=>calculatePackageDimensions([{quantity:1}])).toThrow(/Verified physical/);
    expect(()=>calculatePackageDimensions([{quantity:2}])).toThrow(/multi-item/);
    expect(calculatePackageDimensions([{quantity:1,shippingPackageWeightOz:22,
      shippingPackageLengthIn:8,shippingPackageWidthIn:6,shippingPackageHeightIn:5}]))
      .toEqual({weight:22,length:8,width:6,height:5});
  });
  it('never takes payment against an expired appointment lease', () => {
    const order = { pickup: { mode: 'appointment', date: new Date(Date.now()+86400_000).toISOString() },
      createdAt: new Date(Date.now()-31*60_000).toISOString() };
    expect(isUnpaidPickupLeaseCurrent(order)).toBe(false);
    expect(isUnpaidPickupLeaseCurrent({...order, createdAt: new Date().toISOString()})).toBe(true);
  });
});
