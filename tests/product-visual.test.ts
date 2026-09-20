import { describe, expect, it } from 'vitest';
import {
  getTrustedProductImages,
  hasTrustedProductPhoto,
  resolveProductVisual,
} from '../lib/product-visual';

describe('product visual system', () => {
  it('rejects legacy default and unavailable placeholder assets', () => {
    const product = {
      name: 'Black Minerals',
      category: 'lemonades',
      image: '/images/sea-moss-default.jpg',
      images: ['/images/product-image-unavailable.svg'],
      ingredients: ['Lemon', 'Ginger', 'Sea Moss'],
    };

    expect(getTrustedProductImages(product)).toEqual([]);
    expect(hasTrustedProductPhoto(product)).toBe(false);

    const visual = resolveProductVisual(product);
    expect(visual.mode).toBe('flavor-art');
    expect(visual.monogram).toBe('BM');
    expect(visual.vessel).toBe('bottle');
    expect(visual.ingredients).toEqual(['Lemon', 'Ginger', 'Sea Moss']);
  });

  it('uses a real product image when a non-placeholder source exists', () => {
    const product = {
      name: 'Strawberry Bliss',
      category: 'lemonades',
      image: 'https://cdn.example.com/strawberry-bliss.jpeg',
      ingredients: ['Strawberry', 'Lemon', 'Ginger'],
    };

    expect(getTrustedProductImages(product)).toEqual([
      'https://cdn.example.com/strawberry-bliss.jpeg',
    ]);
    expect(resolveProductVisual(product)).toMatchObject({
      mode: 'photo',
      src: 'https://cdn.example.com/strawberry-bliss.jpeg',
    });
  });

  it('filters placeholder media while preserving a later trusted image', () => {
    const product = {
      name: 'Calm Waters',
      category: 'lemonades',
      displayImage: 'data:image/svg+xml,%3Csvg%3Eplaceholder%3C/svg%3E',
      image: '/images/product-image-unavailable.svg',
      images: [
        '/images/sea-moss-default.svg',
        'https://cdn.example.com/calm-waters.jpeg',
      ],
      ingredients: ['Cucumber', 'Mint', 'Lemon'],
    };

    expect(getTrustedProductImages(product)).toEqual([
      'https://cdn.example.com/calm-waters.jpeg',
    ]);
    expect(resolveProductVisual(product).src).toBe(
      'https://cdn.example.com/calm-waters.jpeg'
    );
  });

  it('honors an explicit missing image status even when a URL is present', () => {
    const product = {
      name: 'Floral Tide',
      category: 'gels',
      imageStatus: 'missing',
      image: 'https://cdn.example.com/unreviewed.jpeg',
      ingredients: ['Hibiscus', 'Sea Moss'],
    };

    expect(getTrustedProductImages(product)).toEqual([]);
    expect(resolveProductVisual(product)).toMatchObject({
      mode: 'flavor-art',
      vessel: 'jar',
    });
  });
});
