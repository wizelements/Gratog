import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Shared mock handles (hoisted)
// ============================================================================

const mockHandles = vi.hoisted(() => {
  const mockCollection = {
    findOneAndUpdate: vi.fn(),
    findOne: vi.fn().mockResolvedValue(null),
    insertOne: vi.fn().mockResolvedValue({ insertedId: 'mock-id' }),
    countDocuments: vi.fn().mockResolvedValue(0),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
    }),
  };
  const mockDb = { collection: vi.fn().mockReturnValue(mockCollection) };
  return { mockCollection, mockDb };
});

vi.mock('@/lib/db-optimized', () => ({
  connectToDatabase: vi.fn().mockResolvedValue({ db: mockHandles.mockDb }),
}));

// ============================================================================
// Imports after mocks
// ============================================================================

import {
  decideBatchPath,
  decideForRequest,
  estimateMarketBottles,
  isMarketSafe,
  poolDemand,
} from '@/lib/batches/batch-decision-engine';
import { DEFAULT_BATCH_OWNER_CONFIG, type BatchOwnerConfig } from '@/lib/batches/types';

describe('batch-decision-engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseConfig: BatchOwnerConfig = {
    ...DEFAULT_BATCH_OWNER_CONFIG,
    standardBatchSizeGallons: 5,
    sharedBatchThresholdGallons: 3,
    processLossPercentage: 0.08,
    depositPercent: 0.5,
  };

  describe('one-gallon requests', () => {
    it('routes a one-gallon market-safe request to owner review when not approved', () => {
      const decision = decideBatchPath({
        pooledGallons: 1,
        requestGallons: 1,
        config: baseConfig,
        isMarketSafe: true,
        ownerApproved: false,
        ingredientAvailable: true,
        shelfLifeOk: true,
        upcomingMarket: true,
        weeklyMicrobatchCount: 0,
        productSlug: 'kissed-by-gods',
        productCategory: 'lemonades',
      });

      expect(decision.path).toBe('owner_review');
      expect(decision.requiresOwnerApproval).toBe(true);
      expect(decision.standardGallonPriceCents).toBeGreaterThan(0);
    });

    it('offers a dedicated microbatch for two-gallon non-market-safe request when owner approved', () => {
      const decision = decideBatchPath({
        pooledGallons: 2,
        requestGallons: 1,
        config: baseConfig,
        isMarketSafe: false,
        ownerApproved: true,
        ingredientAvailable: true,
        shelfLifeOk: true,
        upcomingMarket: true,
        weeklyMicrobatchCount: 0,
        productSlug: 'spicy-bloom',
        productCategory: 'shots',
      });

      expect(decision.path).toBe('dedicated_microbatch');
    });

    it('routes a one-gallon non-market-safe request to owner review when not approved', () => {
      const decision = decideBatchPath({
        pooledGallons: 1,
        requestGallons: 1,
        config: baseConfig,
        isMarketSafe: false,
        ownerApproved: false,
        ingredientAvailable: true,
        shelfLifeOk: true,
        upcomingMarket: true,
        weeklyMicrobatchCount: 0,
        productSlug: 'black-minerals',
        productCategory: 'lemonades',
      });

      expect(decision.path).toBe('owner_review');
      expect(decision.requiresOwnerApproval).toBe(true);
    });

    it('offers a dedicated microbatch for one-gallon non-market-safe request when owner approved', () => {
      const decision = decideBatchPath({
        pooledGallons: 1,
        requestGallons: 1,
        config: baseConfig,
        isMarketSafe: false,
        ownerApproved: true,
        ingredientAvailable: true,
        shelfLifeOk: true,
        upcomingMarket: true,
        weeklyMicrobatchCount: 0,
        productSlug: 'black-minerals',
        productCategory: 'lemonades',
      });

      expect(decision.path).toBe('dedicated_microbatch');
      expect(decision.recommendedBatchType).toBe('dedicated_microbatch');
      expect(decision.setupFeeCents).toBeGreaterThan(0);
      expect(decision.standardGallonPriceCents).toBe(12 * 8 * 100); // $12 bottle * 8 bottles
    });

    it('offers a market-supported batch for one-gallon market-safe request when owner approved', () => {
      const decision = decideBatchPath({
        pooledGallons: 1,
        requestGallons: 1,
        config: baseConfig,
        isMarketSafe: true,
        ownerApproved: true,
        ingredientAvailable: true,
        shelfLifeOk: true,
        upcomingMarket: true,
        weeklyMicrobatchCount: 0,
        productSlug: 'kissed-by-gods',
        productCategory: 'lemonades',
      });

      expect(decision.path).toBe('market_supported');
      expect(decision.recommendedBatchType).toBe('market_supported');
      expect(decision.setupFeeCents).toBe(0);
    });
  });

  describe('category-specific pricing', () => {
    it('uses curated bottle price for lemonade gallon price', () => {
      const decision = decideForRequest(
        {
          productSlug: 'kissed-by-gods',
          productCategory: 'lemonades',
          flavorProfile: null,
          quantity: 1,
          quantityUnit: 'gallon',
          preferredMarketId: 'serenbe',
          hasUpcomingMarket: true,
        },
        { ownerApproved: true, ingredientAvailable: true, upcomingMarket: true }
      );

      expect(decision.standardGallonPriceCents).toBe(8800); // $11 * 8 bottles
    });

    it('uses curated bottle price for refresher gallon price', () => {
      const decision = decideForRequest(
        {
          productSlug: 'peach-refresher',
          productCategory: 'refreshers',
          flavorProfile: null,
          quantity: 1,
          quantityUnit: 'gallon',
          preferredMarketId: 'dunwoody',
          hasUpcomingMarket: true,
        },
        { ownerApproved: true, ingredientAvailable: true, upcomingMarket: true }
      );

      expect(decision.standardGallonPriceCents).toBe(7200); // $9 * 8 bottles
      expect(decision.setupFeeCents).toBeGreaterThan(0);
    });
  });

  describe('pooled demand thresholds', () => {
    it('waits for demand when two gallons pooled and not market-safe', () => {
      const decision = decideBatchPath({
        pooledGallons: 2,
        requestGallons: 1,
        config: baseConfig,
        isMarketSafe: false,
        ownerApproved: true,
        ingredientAvailable: true,
        shelfLifeOk: true,
        upcomingMarket: true,
        weeklyMicrobatchCount: 0,
        productSlug: 'black-minerals',
        productCategory: 'lemonades',
      });

      expect(decision.path).toBe('dedicated_microbatch');
    });

    it('recommends shared standard batch when three gallons pooled', () => {
      const decision = decideBatchPath({
        pooledGallons: 3,
        requestGallons: 1,
        config: baseConfig,
        isMarketSafe: false,
        ownerApproved: true,
        ingredientAvailable: true,
        shelfLifeOk: true,
        upcomingMarket: true,
        weeklyMicrobatchCount: 0,
        productSlug: 'black-minerals',
        productCategory: 'lemonades',
      });

      expect(decision.path).toBe('shared_standard');
      expect(decision.recommendedBatchType).toBe('shared_standard');
      expect(decision.setupFeeCents).toBe(0);
    });

    it('recommends shared standard batch when five gallons fully reserved', () => {
      const decision = decideBatchPath({
        pooledGallons: 5,
        requestGallons: 1,
        config: baseConfig,
        isMarketSafe: true,
        ownerApproved: true,
        ingredientAvailable: true,
        shelfLifeOk: true,
        upcomingMarket: true,
        weeklyMicrobatchCount: 0,
        productSlug: 'kissed-by-gods',
        productCategory: 'lemonades',
      });

      expect(decision.path).toBe('shared_standard');
    });
  });

  describe('market-safe and owner approval edge cases', () => {
    it('returns owner_review when ingredient availability is unknown', () => {
      const decision = decideBatchPath({
        pooledGallons: 1,
        requestGallons: 1,
        config: baseConfig,
        isMarketSafe: true,
        ownerApproved: true,
        ingredientAvailable: false,
        shelfLifeOk: true,
        upcomingMarket: true,
        weeklyMicrobatchCount: 0,
        productSlug: 'kissed-by-gods',
        productCategory: 'lemonades',
      });

      expect(decision.path).toBe('owner_review');
    });

    it('waits for demand for market-safe flavor with no upcoming market', () => {
      const decision = decideBatchPath({
        pooledGallons: 1,
        requestGallons: 1,
        config: baseConfig,
        isMarketSafe: true,
        ownerApproved: true,
        ingredientAvailable: true,
        shelfLifeOk: true,
        upcomingMarket: false,
        weeklyMicrobatchCount: 0,
        productSlug: 'kissed-by-gods',
        productCategory: 'lemonades',
      });

      expect(decision.path).toBe('collect_demand');
    });

    it('collects demand when weekly microbatch limit reached', () => {
      const decision = decideBatchPath({
        pooledGallons: 1,
        requestGallons: 1,
        config: baseConfig,
        isMarketSafe: false,
        ownerApproved: true,
        ingredientAvailable: true,
        shelfLifeOk: true,
        upcomingMarket: true,
        weeklyMicrobatchCount: baseConfig.maxWeeklyMicrobatches,
        productSlug: 'black-minerals',
        productCategory: 'lemonades',
      });

      expect(decision.path).toBe('collect_demand');
    });
  });

  describe('sold-out, deferred, canceled', () => {
    it('treats a one-gallon sold-out flavor as owner_review until owner marks sold-out', () => {
      // The engine itself does not know sold-out state. The caller must pass
      // that context. Without owner approval, any sold-out product defaults to
      // owner review.
      const decision = decideBatchPath({
        pooledGallons: 1,
        requestGallons: 1,
        config: baseConfig,
        isMarketSafe: true,
        ownerApproved: false,
        ingredientAvailable: false,
        shelfLifeOk: true,
        upcomingMarket: true,
        weeklyMicrobatchCount: 0,
        productSlug: 'kissed-by-gods',
        productCategory: 'lemonades',
      });

      expect(decision.path).toBe('owner_review');
    });
  });

  describe('process loss and remaining bottles', () => {
    it('calculates effective market bottles for a five-gallon batch with one gallon reserved', () => {
      const bottles = estimateMarketBottles(5, 1, 0.08, 16);
      // 5 gallons gross = 640 oz. 8% loss => 589 oz. Minus 128 oz reserved => 461 oz. Minus 16 oz samples => 445 oz. / 16 = 27 bottles.
      expect(bottles).toBe(27);
    });

    it('returns zero market bottles if fully reserved', () => {
      const bottles = estimateMarketBottles(5, 5, 0.08, 16);
      expect(bottles).toBe(0);
    });

    it('returns zero market bottles when target is zero or invalid', () => {
      expect(estimateMarketBottles(0, 0, 0.08, 16)).toBe(0);
      expect(estimateMarketBottles(-1, 0, 0.08, 16)).toBe(0);
    });
  });

  describe('poolDemand helper', () => {
    it('sums mixed quantities into gallons', () => {
      const gallons = poolDemand([
        { quantity: 1, quantityUnit: 'gallon' },
        { quantity: 2, quantityUnit: 'half_gallon' },
        { quantity: 4, quantityUnit: 'bottle_16oz' },
      ]);
      // 1 + 1 + 0.5 = 2.5
      expect(gallons).toBe(2.5);
    });
  });

  describe('isMarketSafe helper', () => {
    it('returns true for core flavors', () => {
      expect(isMarketSafe('kissed-by-gods', DEFAULT_BATCH_OWNER_CONFIG.marketSafeCoreFlavors)).toBe(true);
      expect(isMarketSafe('calm-waters', DEFAULT_BATCH_OWNER_CONFIG.marketSafeCoreFlavors)).toBe(true);
    });

    it('returns false for non-core flavors', () => {
      expect(isMarketSafe('spicy-bloom', DEFAULT_BATCH_OWNER_CONFIG.marketSafeCoreFlavors)).toBe(false);
      expect(isMarketSafe(null, DEFAULT_BATCH_OWNER_CONFIG.marketSafeCoreFlavors)).toBe(false);
    });
  });
});
