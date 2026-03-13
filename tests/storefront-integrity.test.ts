import { describe, expect, it } from 'vitest';
import {
  getCanonicalMarketDirectionsUrl,
  isPlaceholderPhoneNumber,
  validateMarketDirectionsConsistency,
  validateStorefrontProducts,
} from '../lib/storefront-integrity';

describe('storefront-integrity', () => {
  it('keeps only publishable products after integrity validation', () => {
    const result = validateStorefrontProducts([
      {
        id: 'valid-product',
        name: 'Mango Sea Moss Gel',
        slug: 'mango-sea-moss-gel',
        description: 'Fresh mango sea moss gel made in small batches for daily wellness support.',
        benefitStory: 'Crafted weekly with wildcrafted sea moss and real fruit for mineral-rich nutrition.',
        image: 'https://cdn.example.com/mango-gel.jpg',
        images: ['https://cdn.example.com/mango-gel.jpg'],
        ingredients: [{ name: 'Sea Moss', benefits: ['Mineral support'] }, { name: 'Mango' }],
        variations: [{ id: 'var-1', name: '16oz', price: 28 }],
      },
      {
        id: 'invalid-product',
        name: 'Placeholder Product',
        slug: 'placeholder-product',
        description: 'Product photo coming soon',
        benefitStory: 'Coming soon',
        image: '/images/placeholder-product.svg',
        ingredients: [],
        variations: [{ id: 'var-2', name: '16oz', price: 0 }],
      },
    ]);

    expect(result.validProducts).toHaveLength(1);
    expect(result.validProducts[0].id).toBe('valid-product');
    expect(result.invalidReports).toHaveLength(1);
    expect(result.invalidReports[0].productId).toBe('invalid-product');
    expect(result.invalidReports[0].errors).toEqual(
      expect.arrayContaining([
        'Missing explicit product description',
        'Missing explicit product benefit story',
        'Missing canonical product image',
        'Missing canonical ingredients',
        'Missing positive product price',
      ])
    );
  });

  it('builds canonical market directions from address data', () => {
    const url = getCanonicalMarketDirectionsUrl({
      address: '10950 Hutcheson Ferry Rd',
      city: 'Palmetto',
      state: 'GA',
      zip: '30268',
    });

    expect(url).toBe(
      'https://www.google.com/maps/search/?api=1&query=10950%20Hutcheson%20Ferry%20Rd%2C%20Palmetto%2C%20GA%2C%2030268'
    );
  });

  it('flags mismatched market directions and placeholder phone numbers', () => {
    const integrity = validateMarketDirectionsConsistency({
      address: '10950 Hutcheson Ferry Rd',
      city: 'Palmetto',
      state: 'GA',
      zip: '30268',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=477+Flat+Shoals+Ave+SE%2C+Atlanta%2C+GA+30316',
      phone: '(404) 555-0123',
    });

    expect(integrity.isValid).toBe(false);
    expect(integrity.errors).toEqual(
      expect.arrayContaining([
        'Directions URL does not match market city',
        'Directions URL does not match market street/zip',
        'Market phone uses placeholder digits',
      ])
    );
  });

  it('detects placeholder phone patterns', () => {
    expect(isPlaceholderPhoneNumber('(404) 555-0199')).toBe(true);
    expect(isPlaceholderPhoneNumber('support-moss-line')).toBe(true);
    expect(isPlaceholderPhoneNumber('+1 (470) 888-1212')).toBe(false);
  });
});
