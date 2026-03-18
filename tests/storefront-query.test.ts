import { describe, expect, it } from 'vitest';
import {
  buildCatalogRoute,
  getCanonicalProductCategoryLabel,
  getCategoryLabelById,
  getProductSearchText,
  normalizeStorefrontText,
  productMatchesCategory,
  resolveCategoryAlias
} from '../lib/storefront-query';

describe('storefront-query', () => {
  it('normalizes storefront text consistently', () => {
    expect(normalizeStorefrontText(' Lemonades & Juices ')).toBe('lemonades and juices');
    expect(normalizeStorefrontText('')).toBe('');
  });

  it('resolves category aliases to canonical ids', () => {
    expect(resolveCategoryAlias('gel')).toBe('sea moss gels');
    expect(resolveCategoryAlias('Lemonades')).toBe('lemonades and juices');
    expect(resolveCategoryAlias('all')).toBe('all');
  });

  it('builds canonical catalog routes with search and category', () => {
    expect(buildCatalogRoute({ search: 'elderberry', category: 'gel' })).toBe('/catalog?search=elderberry&category=sea+moss+gels');
    expect(buildCatalogRoute({ search: 'a', category: 'all' })).toBe('/catalog');
    expect(buildCatalogRoute({ search: '', category: 'shots' })).toBe('/catalog?category=wellness+shots');
  });

  it('matches product categories through aliases', () => {
    const product = {
      intelligentCategory: 'Sea Moss Gels',
      categoryData: { name: 'Sea Moss Gels' },
      category: 'gel'
    };

    expect(productMatchesCategory(product, 'gel')).toBe(true);
    expect(productMatchesCategory(product, 'sea moss gels')).toBe(true);
    expect(productMatchesCategory(product, 'shots')).toBe(false);
  });

  it('builds robust product search text from ingredients and benefits', () => {
    const product = {
      name: 'Elderberry Moss',
      description: 'Immune support blend',
      benefits: ['Immune Support'],
      ingredients: [
        { name: 'Elderberry', benefits: ['immunity'] },
        'Sea Moss'
      ]
    };

    const searchText = getProductSearchText(product);
    expect(searchText).toContain('elderberry moss');
    expect(searchText).toContain('immune support blend');
    expect(searchText).toContain('sea moss');
    expect(searchText).toContain('immunity');
  });

  it('returns canonical labels for products', () => {
    const product = { intelligentCategory: 'wellness shots' };
    expect(getCanonicalProductCategoryLabel(product)).toBe('Wellness Shots');
    expect(getCategoryLabelById('bundles and seasonal')).toBe('Bundles & Seasonal');
  });
});
