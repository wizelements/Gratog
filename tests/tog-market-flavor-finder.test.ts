import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { findMarketFlavors } from '@/lib/market-flavor-finder';
import { buildMarketQrMenu } from '@/lib/market-qr-policy';

const menu = buildMarketQrMenu([]);
const lemonadeItems = menu.filter(item => item.kind === 'lemonade');

describe('Taste of Gratitude first-sip discovery (informational)', () => {
  it('only suggests merchant-approved lemonade items, with no purchase endpoint', () => {
    const results = findMarketFlavors(lemonadeItems, 'tropical', 'none');
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(3);
    for (const result of results) {
      expect(result.kind).toBe('lemonade');
      expect(result.availability).toBe('ask_at_booth');
      expect(result.digitalPurchaseEnabled).toBe(false);
      expect(result.approvedPriceCents).toBe(1199);
      expect(result.ingredients.length).toBeGreaterThan(0);
    }
  });

  it('finds ingredient-grounded tropical flavors without making medical claims', () => {
    const results = findMarketFlavors(lemonadeItems, 'tropical', 'none');
    expect(results.some(item => item.slug === 'passion-guava-pineapple')).toBe(true);
  });

  it('excludes disclosed ingredients rather than claiming allergy-safe production', () => {
    const noGinger = findMarketFlavors(lemonadeItems, 'bright-citrus', 'ginger');
    expect(noGinger.every(item => item.ingredients.every(i => !i.toLowerCase().includes('ginger')))).toBe(true);
    const noPineapple = findMarketFlavors(lemonadeItems, 'tropical', 'pineapple');
    expect(noPineapple.every(item => item.ingredients.every(i => !i.toLowerCase().includes('pineapple')))).toBe(true);
    const noSeaMoss = findMarketFlavors(lemonadeItems, 'tropical', 'sea-moss');
    expect(noSeaMoss.every(item => item.ingredients.every(i => !i.toLowerCase().includes('sea moss')))).toBe(true);
  });

  it('does not suggest unknown ingredients or unsupported product types', () => {
    const unknownIngredients = [{
      ...lemonadeItems[0],
      ingredients: [],
    }];
    expect(findMarketFlavors(unknownIngredients, 'bright-citrus', 'ginger')).toEqual([]);
    const gel = menu.find(item => item.kind === 'gel');
    if (gel) expect(findMarketFlavors([gel], 'tropical', 'none')).toEqual([]);
  });

  it('keeps customer choices on the device, not an automatic marketing opt-in', () => {
    const source = readFileSync('components/market/FlavorFinder.tsx', 'utf8');
    expect(source).not.toContain('fetch(');
    expect(source).not.toContain('track(');
    expect(source).not.toContain('newsletter');
    expect(source).toContain('does not guarantee allergy safety');
    expect(source).toContain('this is not an order or reservation');
  });

  it('anchors recommendations to listed ingredient details in the real QR page', () => {
    const source = readFileSync('app/m/[market]/page.tsx', 'utf8');
    expect(source).toContain('<FlavorFinder lemonades={entries.filter');
    expect(source).toContain('id={`flavor-${item.slug}`}');
  });
});
