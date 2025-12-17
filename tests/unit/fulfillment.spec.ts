import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock process.env
vi.stubEnv('DELIVERY_ZIP_WHITELIST', '30269,30268,30213,30265,30294');
vi.stubEnv('DELIVERY_WINDOWS', '09:00-12:00|12:00-15:00|15:00-18:00');
vi.stubEnv('DELIVERY_MIN_SUBTOTAL', '30');
vi.stubEnv('DELIVERY_BASE_FEE', '6.99');
vi.stubEnv('DELIVERY_FREE_THRESHOLD', '75');
vi.stubEnv('NEXT_PUBLIC_FULFILLMENT_PICKUP', 'enabled');
vi.stubEnv('NEXT_PUBLIC_FULFILLMENT_DELIVERY', 'enabled');
vi.stubEnv('NEXT_PUBLIC_FULFILLMENT_SHIPPING', 'enabled');

describe('Fulfillment Utilities', () => {
  describe('getDeliveryZipWhitelist', () => {
    it('should parse ZIP whitelist from environment', async () => {
      const { getDeliveryZipWhitelist } = await import('@/lib/fulfillment');
      const zips = getDeliveryZipWhitelist();
      expect(zips).toContain('30269');
      expect(zips).toContain('30268');
      expect(zips.length).toBe(5);
    });
  });

  describe('isValidDeliveryZip', () => {
    it('should validate ZIP in whitelist', async () => {
      const { isValidDeliveryZip } = await import('@/lib/fulfillment');
      expect(isValidDeliveryZip('30269')).toBe(true);
    });

    it('should reject ZIP not in whitelist', async () => {
      const { isValidDeliveryZip } = await import('@/lib/fulfillment');
      expect(isValidDeliveryZip('12345')).toBe(false);
    });

    it('should handle empty input', async () => {
      const { isValidDeliveryZip } = await import('@/lib/fulfillment');
      expect(isValidDeliveryZip('')).toBe(false);
    });

    it('should clean ZIP code formatting', async () => {
      const { isValidDeliveryZip } = await import('@/lib/fulfillment');
      expect(isValidDeliveryZip(' 30269 ')).toBe(true);
      expect(isValidDeliveryZip('30269-1234')).toBe(true);
    });
  });

  describe('getDeliveryConfig', () => {
    it('should return correct config values', async () => {
      const { getDeliveryConfig } = await import('@/lib/fulfillment');
      const config = getDeliveryConfig();
      
      expect(config.minSubtotal).toBe(30);
      expect(config.baseFee).toBe(6.99);
      expect(config.freeThreshold).toBe(75);
    });
  });

  describe('calculateDeliveryFee', () => {
    it('should charge delivery fee below threshold', async () => {
      const { calculateDeliveryFee } = await import('@/lib/fulfillment');
      expect(calculateDeliveryFee(50)).toBe(6.99);
    });

    it('should waive fee at threshold', async () => {
      const { calculateDeliveryFee } = await import('@/lib/fulfillment');
      expect(calculateDeliveryFee(75)).toBe(0);
    });

    it('should waive fee above threshold', async () => {
      const { calculateDeliveryFee } = await import('@/lib/fulfillment');
      expect(calculateDeliveryFee(100)).toBe(0);
    });
  });

  describe('getFreeDeliveryProgress', () => {
    it('should calculate remaining amount for free delivery', async () => {
      const { getFreeDeliveryProgress } = await import('@/lib/fulfillment');
      expect(getFreeDeliveryProgress(50)).toBe(25);
    });

    it('should return 0 at threshold', async () => {
      const { getFreeDeliveryProgress } = await import('@/lib/fulfillment');
      expect(getFreeDeliveryProgress(75)).toBe(0);
    });

    it('should return 0 above threshold', async () => {
      const { getFreeDeliveryProgress } = await import('@/lib/fulfillment');
      expect(getFreeDeliveryProgress(100)).toBe(0);
    });
  });

  describe('isValidTip', () => {
    it('should accept valid tip amounts', async () => {
      const { isValidTip } = await import('@/lib/fulfillment');
      expect(isValidTip(0)).toBe(true);
      expect(isValidTip(5)).toBe(true);
      expect(isValidTip(10.50)).toBe(true);
    });

    it('should reject negative tips', async () => {
      const { isValidTip } = await import('@/lib/fulfillment');
      expect(isValidTip(-5)).toBe(false);
    });

    it('should reject excessive tips', async () => {
      const { isValidTip } = await import('@/lib/fulfillment');
      expect(isValidTip(101)).toBe(false);
    });

    it('should handle string inputs', async () => {
      const { isValidTip } = await import('@/lib/fulfillment');
      expect(isValidTip('5')).toBe(true);
      expect(isValidTip('invalid')).toBe(false);
    });
  });

  describe('sanitizeTip', () => {
    it('should round to 2 decimal places', async () => {
      const { sanitizeTip } = await import('@/lib/fulfillment');
      expect(sanitizeTip(5.999)).toBe(6);
      expect(sanitizeTip(5.123)).toBe(5.12);
    });

    it('should return 0 for invalid tips', async () => {
      const { sanitizeTip } = await import('@/lib/fulfillment');
      expect(sanitizeTip(-5)).toBe(0);
      expect(sanitizeTip('invalid')).toBe(0);
    });
  });

  describe('getDeliveryWindows', () => {
    it('should parse delivery windows from environment', async () => {
      const { getDeliveryWindows } = await import('@/lib/fulfillment');
      const windows = getDeliveryWindows();
      
      expect(windows).toContain('09:00-12:00');
      expect(windows).toContain('12:00-15:00');
      expect(windows).toContain('15:00-18:00');
    });
  });

  describe('parseDeliveryWindow', () => {
    it('should parse valid window string', async () => {
      const { parseDeliveryWindow } = await import('@/lib/fulfillment');
      const result = parseDeliveryWindow('09:00-12:00');
      
      expect(result).not.toBeNull();
      expect(result?.start.getHours()).toBe(9);
      expect(result?.end.getHours()).toBe(12);
    });

    it('should return null for invalid window', async () => {
      const { parseDeliveryWindow } = await import('@/lib/fulfillment');
      expect(parseDeliveryWindow('')).toBeNull();
      expect(parseDeliveryWindow('invalid')).toBeNull();
    });
  });

  describe('validateDeliveryData', () => {
    it('should validate complete delivery data', async () => {
      const { validateDeliveryData } = await import('@/lib/fulfillment');
      const result = validateDeliveryData({
        zip: '30269',
        window: 'anytime',
        subtotal: 50
      });
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid ZIP', async () => {
      const { validateDeliveryData } = await import('@/lib/fulfillment');
      const result = validateDeliveryData({
        zip: '12345',
        window: 'anytime',
        subtotal: 50
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('area'))).toBe(true);
    });

    it('should reject subtotal below minimum', async () => {
      const { validateDeliveryData } = await import('@/lib/fulfillment');
      const result = validateDeliveryData({
        zip: '30269',
        window: 'anytime',
        subtotal: 20
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Minimum'))).toBe(true);
    });

    it('should reject missing window', async () => {
      const { validateDeliveryData } = await import('@/lib/fulfillment');
      const result = validateDeliveryData({
        zip: '30269',
        window: '',
        subtotal: 50
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('window'))).toBe(true);
    });
  });

  describe('validatePickupData', () => {
    it('should validate complete pickup data', async () => {
      const { validatePickupData } = await import('@/lib/fulfillment');
      const result = validatePickupData({
        market: 'serenbe'
      });
      
      expect(result.valid).toBe(true);
    });

    it('should reject missing market', async () => {
      const { validatePickupData } = await import('@/lib/fulfillment');
      const result = validatePickupData({
        market: ''
      });
      
      expect(result.valid).toBe(false);
    });
  });

  describe('validateShippingData', () => {
    it('should validate complete shipping data', async () => {
      const { validateShippingData } = await import('@/lib/fulfillment');
      const result = validateShippingData({
        street: '123 Main Street',
        city: 'Atlanta',
        state: 'GA',
        zip: '30301'
      });
      
      expect(result.valid).toBe(true);
    });

    it('should reject incomplete address', async () => {
      const { validateShippingData } = await import('@/lib/fulfillment');
      const result = validateShippingData({
        street: '',
        city: 'Atlanta',
        state: 'GA',
        zip: '30301'
      });
      
      expect(result.valid).toBe(false);
    });

    it('should reject invalid ZIP format', async () => {
      const { validateShippingData } = await import('@/lib/fulfillment');
      const result = validateShippingData({
        street: '123 Main Street',
        city: 'Atlanta',
        state: 'GA',
        zip: 'invalid'
      });
      
      expect(result.valid).toBe(false);
    });
  });
});
