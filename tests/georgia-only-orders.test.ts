import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateGeorgiaDestination, GEORGIA_ONLY_NOTICE } from '@/lib/georgia-orders';

const read = (name: string) => readFileSync(resolve(process.cwd(), name), 'utf8');

describe('Georgia-only fulfillment', () => {
  it.each([
    [{ state: 'GA', zip: '30303' }],
    [{ state: 'Georgia', zip: '31401', country: 'US' }],
    [{ state: ' ga ', zip: '39819', countryCode: 'USA' }],
    [{ state: 'GA', zip: '31901-1234', country: 'United States' }],
  ])('accepts eligible Georgia destination format %#', (address) => {
    expect(validateGeorgiaDestination(address).valid).toBe(true);
  });

  it.each([
    [{ state: 'AL', zip: '30303' }],
    [{ state: 'GA', zip: '10001' }],
    [{ state: 'GA', zip: '32003' }],
    [{ state: 'GA', zip: '90210' }],
    [{ state: 'GA', zip: '30303', country: 'CA' }],
    [{ state: '', zip: '30303' }],
    [{ state: 'GA', zip: '' }],
    [{ state: 'GA', zip: 'abcde' }],
    [null],
  ])('rejects non-Georgia or incomplete destination %#', (address) => {
    expect(validateGeorgiaDestination(address).valid).toBe(false);
  });

  it('enforces Georgia at quote, order creation, payment and shipping service boundaries', () => {
    for (const path of [
      'app/api/orders/create/route.js',
      'app/api/payments/route.ts',
      'app/api/delivery/quote/route.ts',
      'app/api/shipping/rates/route.ts',
      'lib/shipping-service.ts',
    ]) {
      expect(read(path), path).toContain('validateGeorgiaDestination');
    }
  });

  it('states Georgia-only fulfillment clearly to customers', () => {
    expect(GEORGIA_ONLY_NOTICE).toContain('Georgia only');
    for (const path of [
      'components/home/HomePageClient.jsx',
      'components/checkout/CheckoutRoot.tsx',
      'components/checkout/ShippingForm.tsx',
      'app/faq/page.js',
      'app/terms/page.js',
    ]) {
      expect(read(path), path).toMatch(/Georgia/);
    }
    for (const path of ['components/checkout/ShippingForm.tsx', 'components/checkout/CheckoutRoot.tsx', 'app/faq/page.js', 'app/terms/page.js']) {
      expect(read(path), path).not.toMatch(/ship(?:ping)? (?:eligible products )?nationwide|ship via USPS Priority Mail.*all US states|eligible items may be shipped nationwide/i);
    }
  });
});
