import { describe, it, expect, vi } from 'vitest';

// No API keys set = flat rate mode
vi.stubEnv('SHIPENGINE_API_KEY', '');
vi.stubEnv('EASYPOST_API_KEY', '');

describe('Shipping Service', () => {
  describe('isShippingApiConfigured', () => {
    it('should return false when no API key is set', async () => {
      const { isShippingApiConfigured } = await import('@/lib/shipping-service');
      expect(isShippingApiConfigured()).toBe(false);
    });
  });

  describe('getShippingRates (flat rate mode)', () => {
    it('should return flat rates when API not configured', async () => {
      const { getShippingRates } = await import('@/lib/shipping-service');
      
      const rates = await getShippingRates({
        street: '123 Main St',
        city: 'Atlanta',
        state: 'GA',
        zip: '30301'
      });
      
      expect(rates).toHaveLength(3);
      expect(rates[0].rate).toBe(6.99);
      expect(rates[1].rate).toBe(12.99);
      expect(rates[2].rate).toBe(24.99);
    });

    it('should include estimated delivery dates', async () => {
      const { getShippingRates } = await import('@/lib/shipping-service');
      
      const rates = await getShippingRates({
        street: '123 Main St',
        city: 'Atlanta',
        state: 'GA',
        zip: '30301'
      });
      
      rates.forEach(rate => {
        expect(rate.deliveryDate).toBeDefined();
        expect(rate.estimatedDays).toBeGreaterThan(0);
      });
    });
  });

  describe('validateAddress', () => {
    it('should validate complete address', async () => {
      const { validateAddress } = await import('@/lib/shipping-service');
      
      const result = await validateAddress({
        street: '123 Main Street',
        city: 'Atlanta',
        state: 'GA',
        zip: '30301'
      });
      
      expect(result.valid).toBe(true);
    });

    it('should reject missing street', async () => {
      const { validateAddress } = await import('@/lib/shipping-service');
      
      const result = await validateAddress({
        street: '',
        city: 'Atlanta',
        state: 'GA',
        zip: '30301'
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('Street'))).toBe(true);
    });

    it('should reject missing city', async () => {
      const { validateAddress } = await import('@/lib/shipping-service');
      
      const result = await validateAddress({
        street: '123 Main St',
        city: '',
        state: 'GA',
        zip: '30301'
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('City'))).toBe(true);
    });

    it('should reject invalid state code', async () => {
      const { validateAddress } = await import('@/lib/shipping-service');
      
      const result = await validateAddress({
        street: '123 Main St',
        city: 'Atlanta',
        state: 'Georgia', // Should be 2-letter code
        zip: '30301'
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('state'))).toBe(true);
    });

    it('should reject invalid ZIP code', async () => {
      const { validateAddress } = await import('@/lib/shipping-service');
      
      const result = await validateAddress({
        street: '123 Main St',
        city: 'Atlanta',
        state: 'GA',
        zip: 'invalid'
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('ZIP'))).toBe(true);
    });

    it('should accept ZIP+4 format', async () => {
      const { validateAddress } = await import('@/lib/shipping-service');
      
      const result = await validateAddress({
        street: '123 Main St',
        city: 'Atlanta',
        state: 'GA',
        zip: '30301-1234'
      });
      
      expect(result.valid).toBe(true);
    });
  });

  describe('createShipment (flat rate mode)', () => {
    it('should create shipment with mock tracking', async () => {
      const { createShipment } = await import('@/lib/shipping-service');
      
      const result = await createShipment(
        'order_123',
        'flat_standard',
        {
          street: '123 Main St',
          city: 'Atlanta',
          state: 'GA',
          zip: '30301'
        }
      );
      
      expect(result.trackingNumber).toBeDefined();
      expect(result.trackingNumber).toContain('TOG');
      expect(result.carrier).toBe('USPS');
    });
  });

  describe('calculatePackageDimensions', () => {
    it('should calculate package weight from items', async () => {
      const { calculatePackageDimensions } = await import('@/lib/shipping-service');
      
      const dims = calculatePackageDimensions([
        { weight: 8, quantity: 2 }, // 16oz
        { weight: 16, quantity: 1 } // 16oz
      ]);
      
      // 32oz items + 4oz packaging = 36oz
      expect(dims.weight).toBe(36);
    });

    it('should use default weight when not specified', async () => {
      const { calculatePackageDimensions } = await import('@/lib/shipping-service');
      
      const dims = calculatePackageDimensions([
        { quantity: 2 } // No weight specified, defaults to 8oz each
      ]);
      
      // 16oz items + 4oz packaging = 20oz
      expect(dims.weight).toBe(20);
    });

    it('should scale height with item count', async () => {
      const { calculatePackageDimensions } = await import('@/lib/shipping-service');
      
      const smallOrder = calculatePackageDimensions([
        { quantity: 1 }
      ]);
      
      const largeOrder = calculatePackageDimensions([
        { quantity: 1 },
        { quantity: 1 },
        { quantity: 1 },
        { quantity: 1 },
        { quantity: 1 },
        { quantity: 1 }
      ]);
      
      expect(largeOrder.height).toBeGreaterThan(smallOrder.height!);
    });
  });

  describe('getTrackingInfo (mock mode)', () => {
    it('should return mock tracking data', async () => {
      const { getTrackingInfo } = await import('@/lib/shipping-service');
      
      const result = await getTrackingInfo('TOG123456');
      
      expect(result.trackingNumber).toBe('TOG123456');
      expect(result.status).toBe('in_transit');
      expect(result.events).toHaveLength(1);
    });
  });
});
