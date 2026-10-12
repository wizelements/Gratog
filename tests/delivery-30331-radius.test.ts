import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { checkDeliveryRadius } from '@/lib/delivery-radius';
import { calculateDistanceBasedDeliveryFee } from '@/lib/delivery-fees';
import { Fulfillment } from '@/adapters/fulfillmentAdapter';

const originalFetch = globalThis.fetch;
function mockGeocode(lat: number, lon: number) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [{ lat: String(lat), lon: String(lon) }],
  }) as typeof fetch;
}

describe('35-mile Georgia delivery centered on 30331', () => {
  afterEach(() => { globalThis.fetch = originalFetch; });
  it('accepts the Atlanta 30331 center and existing free radius', async () => {
    mockGeocode(33.705, -84.53);
    const result = await checkDeliveryRadius('Atlanta, GA 30331');
    expect(result.eligible).toBe(true);
    expect(result.distance).toBe(0);
    expect(result.nearestLocationName).toBe('Atlanta ZIP 30331');
    expect(calculateDistanceBasedDeliveryFee(result.distance, 60)).toBe(0);
  });
  it('accepts an address between the old 25- and new 35-mile boundaries', async () => {
    mockGeocode(34.14, -84.53); // ~30 straight-line miles north of 30331
    const result = await checkDeliveryRadius('Georgia destination');
    expect(result.distance).toBeGreaterThan(25);
    expect(result.distance).toBeLessThan(35);
    expect(result.eligible).toBe(true);
    // Existing maximum authorized delivery charge is extended unchanged.
    expect(calculateDistanceBasedDeliveryFee(result.distance, 60)).toBe(15.99);
  });
  it('rejects an address beyond 35 miles, even if its ZIP looks valid', async () => {
    mockGeocode(34.31, -84.53); // >40 miles north
    const result = await checkDeliveryRadius('Georgia destination');
    expect(result.distance).toBeGreaterThan(35);
    expect(result.eligible).toBe(false);
  });
  it('does not treat ZIP format as proof of service eligibility', () => {
    expect(Fulfillment.isZipServiceable('30331')).toBe(true);
    expect(Fulfillment.isZipServiceable('99999')).toBe(true);
    expect(Fulfillment.isZipServiceable('bad')).toBe(false);
  });
});
