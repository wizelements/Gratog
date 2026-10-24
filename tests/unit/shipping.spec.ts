import { describe, it, expect, vi, afterEach } from 'vitest';
import { getShippingRates, validateAddress, createShipment, getTrackingInfo,
  calculatePackageDimensions, isShippingApiConfigured, shippingMethodKey } from '@/lib/shipping-service';

afterEach(() => vi.unstubAllEnvs());

const georgia = { street: '123 Main Street', city: 'Atlanta', state: 'GA', zip: '30301' };
const physical = { quantity: 1, shippingPackageWeightOz: 22,
  shippingPackageLengthIn: 8, shippingPackageWidthIn: 6, shippingPackageHeightIn: 5 };

describe('Shipping Service — verified fulfillment contract', () => {
  describe('service activation', () => {
    it('reports no provider when both credentials are absent', () => {
      vi.stubEnv('SHIPENGINE_API_KEY', '');
      vi.stubEnv('EASYPOST_API_KEY', '');
      expect(isShippingApiConfigured()).toBe(false);
    });
    it('refuses rates until merchant operational and origin approval', async () => {
      vi.stubEnv('GA_SHIPPING_OPERATIONAL_APPROVED', '');
      vi.stubEnv('SHIPPING_ORIGIN_VERIFIED', '');
      await expect(getShippingRates(georgia, calculatePackageDimensions([physical])))
        .rejects.toThrow(/not certified/i);
    });
    it('does not silently offer flat rates without a carrier', async () => {
      vi.stubEnv('GA_SHIPPING_OPERATIONAL_APPROVED', 'true');
      vi.stubEnv('SHIPPING_ORIGIN_VERIFIED', 'true');
      vi.stubEnv('SHIPENGINE_API_KEY', '');
      vi.stubEnv('EASYPOST_API_KEY', '');
      await expect(getShippingRates(georgia, calculatePackageDimensions([physical])))
        .rejects.toThrow(/dispatch address|not configured/i);
    });
    it('uses carrier/service identity rather than a browser-supplied price', () => {
      expect(shippingMethodKey({ carrier: ' UPS ', service: ' Ground ' })).toBe('ups::ground');
      expect(shippingMethodKey({ carrier: 'UPS', service: 'Next Day' })).not.toBe('ups::ground');
    });
  });
  describe('Georgia destinations', () => {
    it('accepts a valid complete in-state address', async () => {
      expect((await validateAddress(georgia)).valid).toBe(true);
    });
    it('rejects missing street', async () => {
      const result = await validateAddress({...georgia, street: ''});
      expect(result.valid).toBe(false);
      expect(result.errors?.some(v => /street/i.test(v))).toBe(true);
    });
    it('rejects missing city', async () => {
      const result = await validateAddress({...georgia, city: ''});
      expect(result.valid).toBe(false);
      expect(result.errors?.some(v => /city/i.test(v))).toBe(true);
    });
    it('rejects mismatched or non-Georgia destination', async () => {
      expect((await validateAddress({...georgia, state:'FL'})).valid).toBe(false);
      expect((await validateAddress({...georgia, zip:'10001'})).valid).toBe(false);
      expect((await validateAddress({...georgia, state:'Georgia'})).valid).toBe(false);
    });
    it('rejects malformed ZIP', async () => {
      expect((await validateAddress({...georgia, zip: 'invalid'})).valid).toBe(false);
    });
    it('accepts Georgia ZIP+4', async () => {
      expect((await validateAddress({...georgia, zip: '30301-1234'})).valid).toBe(true);
    });
  });
  describe('carrier label and tracking', () => {
    it('never invents a shipment or synthetic tracking number', async () => {
      vi.stubEnv('SHIPENGINE_API_KEY','');
      await expect(createShipment('order_123', 'flat_standard', georgia))
        .rejects.toThrow(/mock tracking identifiers are not permitted/i);
    });
    it('does not claim shipped when the carrier is unavailable', async () => {
      vi.stubEnv('SHIPENGINE_API_KEY','');
      await expect(createShipment('order_123', 'carrier_rate_123', georgia))
        .rejects.toThrow(/label purchase failed/i);
    });
    it('never fabricates in-transit tracking', async () => {
      vi.stubEnv('SHIPENGINE_API_KEY','');
      await expect(getTrackingInfo('TOG123456'))
        .rejects.toThrow(/not been verified/i);
    });
  });
  describe('physical packed dimensions', () => {
    it('uses approved exact measured dimensions', () => {
      expect(calculatePackageDimensions([physical])).toEqual({
        weight:22, length:8, width:6, height:5
      });
    });
    it('rejects missing physical measurements instead of defaulting', () => {
      expect(() => calculatePackageDimensions([{quantity:1}]))
        .toThrow(/verified physical/i);
    });
    it('rejects unsafe multi-product and multi-quantity parcel guesses', () => {
      expect(() => calculatePackageDimensions([{...physical,quantity:2}]))
        .toThrow(/multi-item/i);
      expect(() => calculatePackageDimensions([physical,physical]))
        .toThrow(/multi-item/i);
    });
    it('rejects nonsensical weight and sizes', () => {
      expect(() => calculatePackageDimensions([{...physical, shippingPackageWeightOz: 0}]))
        .toThrow(/verified physical/i);
      expect(() => calculatePackageDimensions([{...physical, shippingPackageLengthIn: -2}]))
        .toThrow(/verified physical/i);
    });
  });
});
