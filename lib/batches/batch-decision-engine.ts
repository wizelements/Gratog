/**
 * Fresh Batch Request System — configurable batch decision engine
 *
 * Determines which production path a flavor request should take based on:
 * - pooled demand
 * - product category
 * - market-safe flags
 * - owner approval
 * - ingredient availability
 * - shelf-life and market schedule
 *
 * The engine never auto-approves production. Owner approval is required for
 * every path except "collect more demand".
 */

import type { ProductCategory } from '@/data/products';
import {
  type BatchDecision,
  type BatchOwnerConfig,
  type BatchType,
  type DecisionPath,
  DEFAULT_BATCH_OWNER_CONFIG,
} from './types';
import {
  toGallonEquivalent,
  type QuantityUnit,
} from './quantity-converter';
import { fallbackGallonPriceCents, setupFeeCents, standardGallonPriceCents } from './pricing';

export interface DemandSignal {
  productSlug: string | null;
  productCategory: ProductCategory | null;
  flavorProfile: string | null;
  quantity: number;
  quantityUnit: QuantityUnit;
  preferredMarketId: string;
  hasUpcomingMarket: boolean;
}

export interface DecisionContext {
  /** Combined demand in gallons for this flavor/profile/market cluster. */
  pooledGallons: number;
  /** Demand from the single current request. */
  requestGallons: number;
  /** Owner-configurable rules. */
  config: BatchOwnerConfig;
  /** Whether a known product slug belongs to the owner-approved market-safe list. */
  isMarketSafe: boolean;
  /** Whether the owner has explicitly approved production. */
  ownerApproved: boolean;
  /** Whether the owner has flagged that ingredients/packaging are available. */
  ingredientAvailable: boolean;
  /** Whether the flavor can be safely sold at the upcoming market within shelf life. */
  shelfLifeOk: boolean;
  /** Whether there is an upcoming qualifying market before the need-by date. */
  upcomingMarket: boolean;
  /** How many custom microbatches the owner has already scheduled this week. */
  weeklyMicrobatchCount: number;
}

function formatGallons(g: number): string {
  if (Number.isInteger(g)) return `${g}`;
  return g.toFixed(2);
}

/**
 * Decide a production path for a flavor demand cluster.
 *
 * Rules (in priority order):
 * 1. Owner review required if owner approval is missing.
 * 2. Wait for demand if pooled demand is below threshold and the flavor is not market-safe.
 * 3. Dedicated microbatch if pooled demand is below threshold, the flavor is not market-safe,
 *    owner approves, ingredient is available, and weekly microbatch limit allows.
 * 4. Market-supported batch if below threshold but the flavor is market-safe, upcoming market exists,
 *    shelf-life is ok, and owner approves.
 * 5. Shared standard batch if pooled demand reaches the threshold and owner approves.
 */
export function decideBatchPath(context: DecisionContext): BatchDecision {
  const {
    pooledGallons,
    requestGallons,
    config,
    isMarketSafe,
    ownerApproved,
    ingredientAvailable,
    shelfLifeOk,
    upcomingMarket,
    weeklyMicrobatchCount,
    productSlug,
    productCategory,
  } = context;

  const threshold = config.sharedBatchThresholdGallons;
  const standardSize = config.standardBatchSizeGallons;

  // Determine base pricing from curated data or owner config.
  const category = productCategory ?? 'lemonades';
  const price =
    (productSlug ? standardGallonPriceCents(productSlug) : null) ??
    fallbackGallonPriceCents(category) ??
    0;
  const microFee = setupFeeCents(productSlug, category);

  // Helper to build a decision with consistent pricing.
  const decision = (
    path: DecisionPath,
    recommendedBatchType: BatchType | null,
    reason: string,
    notes: string,
    requiresOwnerApproval: boolean
  ): BatchDecision => ({
    path,
    reason,
    recommendedBatchType,
    setupFeeCents: path === 'dedicated_microbatch' ? microFee : 0,
    standardGallonPriceCents: price,
    depositPercent: config.depositPercent,
    requiresOwnerApproval,
    notes,
  });

  // 1. Owner approval is always required before production.
  if (!ownerApproved) {
    return decision(
      'owner_review',
      null,
      'Owner approval is required before any production decision.',
      `Pooled demand is ${formatGallons(pooledGallons)} gallons. Awaiting owner review.`,
      true
    );
  }

  // 2. Without enough pooled demand, evaluate microbatch or market-safe paths.
  if (pooledGallons < threshold) {
    if (!ingredientAvailable) {
      return decision(
        'owner_review',
        null,
        'Ingredient/packaging availability is uncertain.',
        'Owner must confirm ingredient availability before a microbatch or market batch is scheduled.',
        true
      );
    }

    if (!isMarketSafe) {
      if (weeklyMicrobatchCount >= config.maxWeeklyMicrobatches) {
        return decision(
          'collect_demand',
          null,
          'Weekly custom microbatch limit reached.',
          `Only ${config.maxWeeklyMicrobatches} custom microbatches are allowed per week. Your request will stay in the pool until more demand is collected or the next production window opens.`,
          false
        );
      }
      return decision(
        'dedicated_microbatch',
        'dedicated_microbatch',
        'Demand is below shared threshold and flavor is not market-safe; owner-approved dedicated microbatch is recommended.',
        `Pooled demand is ${formatGallons(pooledGallons)} gallons. A ${formatGallons(requestGallons)}-gallon dedicated microbatch with a setup fee will be produced after owner approval and deposit.`,
        true
      );
    }

    // Market-safe flavor below threshold.
    if (!upcomingMarket || !shelfLifeOk) {
      return decision(
        'collect_demand',
        null,
        isMarketSafe
          ? 'Flavor is market-safe but no qualifying market or shelf-life window supports speculative production.'
          : 'Demand is below threshold and no qualifying market exists.',
        `Pooled demand is ${formatGallons(pooledGallons)} gallons. We are collecting more requests and will re-evaluate when a market window opens.`,
        false
      );
    }

    return decision(
      'market_supported',
      'market_supported',
      'Market-safe flavor with upcoming market; owner-approved market-supported batch is recommended.',
      `Pooled demand is ${formatGallons(pooledGallons)} gallons, below the ${threshold}-gallon shared threshold, but this flavor is approved for market sales and a qualifying market is scheduled.`,
      true
    );
  }

  // 3. Pooled demand meets shared threshold.
  if (pooledGallons >= standardSize) {
    return decision(
      'shared_standard',
      'shared_standard',
      'Pooled demand fills the standard batch size.',
      `Pooled demand is ${formatGallons(pooledGallons)} gallons, filling the ${standardSize}-gallon standard batch. Remaining bottles will be allocated to market samples and walk-up sales.`,
      true
    );
  }

  // 4. Pooled demand is between threshold and standard size.
  return decision(
    'shared_standard',
    'shared_standard',
    'Pooled demand meets the shared-batch threshold.',
    `Pooled demand is ${formatGallons(pooledGallons)} gallons, meeting the ${threshold}-gallon threshold. A ${standardSize}-gallon standard batch will be produced; remaining bottles will be available at the market.`,
    true
  );
}

/**
 * Compute pooled demand from a list of requests, summing gallon equivalents.
 */
export function poolDemand(
  requests: Array<{ quantity: number; quantityUnit: QuantityUnit }>
): number {
  return requests.reduce((sum, r) => {
    return sum + toGallonEquivalent(r.quantity, r.quantityUnit);
  }, 0);
}

/**
 * Estimate how many 16 oz bottles remain for market sale after a batch is reserved.
 */
export function estimateMarketBottles(
  standardGallons: number,
  reservedGallons: number,
  processLossPercentage: number,
  samplingOunces: number
): number {
  const grossOunces = standardGallons * 128;
  const reservedOunces = Math.max(0, reservedGallons) * 128;
  const effectiveOunces = grossOunces * (1 - Math.max(0, Math.min(processLossPercentage, 1)));
  const availableOunces = Math.max(
    0,
    effectiveOunces - reservedOunces - Math.max(0, samplingOunces)
  );
  return Math.floor(availableOunces / 16);
}

/**
 * Returns true if a flavor/product is owner-approved as market-safe.
 */
export function isMarketSafe(
  productSlug: string | null,
  marketSafeCoreFlavors: string[]
): boolean {
  if (!productSlug) return false;
  return marketSafeCoreFlavors.map((s) => s.toLowerCase()).includes(productSlug.toLowerCase());
}

/**
 * Convenience wrapper for a single request against the default config.
 */
export function decideForRequest(
  demand: DemandSignal,
  options?: Partial<DecisionContext>
): BatchDecision {
  const config = options?.config ?? DEFAULT_BATCH_OWNER_CONFIG;
  const pooledGallons = poolDemand([
    { quantity: demand.quantity, quantityUnit: demand.quantityUnit },
  ]);

  return decideBatchPath({
    pooledGallons,
    requestGallons: pooledGallons,
    config,
    isMarketSafe: isMarketSafe(demand.productSlug, config.marketSafeCoreFlavors),
    ownerApproved: options?.ownerApproved ?? false,
    ingredientAvailable: options?.ingredientAvailable ?? true,
    shelfLifeOk: options?.shelfLifeOk ?? true,
    upcomingMarket: options?.upcomingMarket ?? demand.hasUpcomingMarket,
    weeklyMicrobatchCount: options?.weeklyMicrobatchCount ?? 0,
    productSlug: demand.productSlug,
    productCategory: demand.productCategory,
  });
}
