import { describe, expect, it } from 'vitest';
import { enhanceProductWithPlaceholder } from '../lib/product-enhancements';
import { PRODUCT_IMAGE_FALLBACK_SRC } from '../lib/storefront-integrity';

describe('product-enhancements', () => {
  it('keeps canonical image fields real-only while deriving intelligent placeholder media', () => {
    const enhancedProduct = enhanceProductWithPlaceholder({
      id: 'ginger-glow-gel',
      name: 'Ginger Glow Gel',
      category: 'gel',
      description: 'Small-batch sea moss gel blended with ginger and lemon for a bright daily ritual.',
      benefitStory: 'Built for mineral-rich immune support with a zesty finish.',
      image: PRODUCT_IMAGE_FALLBACK_SRC,
      images: [PRODUCT_IMAGE_FALLBACK_SRC],
      ingredients: [{ name: 'Sea Moss' }, { name: 'Ginger' }, { name: 'Lemon' }],
      healthBenefitLabels: ['Immune Support', 'Digestive Health'],
      primaryHealthBenefit: { label: 'Immune Support' }
    });

    expect(enhancedProduct.image).toBe('');
    expect(enhancedProduct.images).toEqual([]);
    expect(enhancedProduct.isPlaceholder).toBe(true);
    expect(enhancedProduct.originalImageMissing).toBe(true);
    expect(enhancedProduct.displayImage).toMatch(/^data:image\/svg\+xml/);
    expect(enhancedProduct.placeholderImage).toBe(enhancedProduct.displayImage);
    expect(enhancedProduct.imageAlt).toContain('Ginger Glow Gel');
    expect(enhancedProduct.imageAlt).toContain('Sea Moss');
    expect(enhancedProduct.imageDescription).toContain('Immune Support');

    const decodedPlaceholder = decodeURIComponent(enhancedProduct.displayImage.split(',')[1]);
    expect(decodedPlaceholder).toContain('Ginger Glow Gel');
    expect(decodedPlaceholder).toContain('Immune Support');
    expect(decodedPlaceholder).toContain('Crafted with Sea Moss');
  });
});
