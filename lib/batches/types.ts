/**
 * Fresh Batch Request System — shared types and enums
 *
 * This module defines the data shapes for customer requests, batch campaigns,
 * and reservations. All prices are expressed in USD cents to avoid floating-point
 * drift. Volume is expressed in US fluid ounces for physical product math and in
 * gallon-equivalents for decision thresholds.
 */

import type { ProductCategory } from '@/data/products';

// ---------------------------------------------------------------------------
// Customer request
// ---------------------------------------------------------------------------

export const QUANTITY_UNITS = [
  'bottle_16oz',
  'multi_bottle',
  'half_gallon',
  'gallon',
  'two_gallons',
  'three_plus_gallons',
  'sample_interest',
] as const;

export type QuantityUnit = (typeof QUANTITY_UNITS)[number];

export const FLAVOR_PROFILES = [
  'tropical',
  'berry-forward',
  'citrus',
  'ginger-forward',
  'mint-forward',
  'herbal',
  'creamy-coconut',
  'blue-spirulina',
  'surprise-me',
] as const;

export type FlavorProfile = (typeof FLAVOR_PROFILES)[number];

export const REQUEST_SOURCES = [
  'homepage_hero',
  'product_page',
  'markets_page',
  'weekly_menu',
  'direct',
] as const;

export type RequestSource = (typeof REQUEST_SOURCES)[number];

export type RequestStatus =
  | 'requested'
  | 'collecting_demand'
  | 'owner_review'
  | 'awaiting_threshold'
  | 'approved'
  | 'reservation_offered'
  | 'deposit_pending'
  | 'confirmed'
  | 'in_production'
  | 'market_available'
  | 'fully_reserved'
  | 'sold_out'
  | 'completed'
  | 'deferred'
  | 'canceled';

export interface FreshBatchRequest {
  id: string;
  email: string;
  phone: string | null;
  smsConsent: boolean;
  marketingEmailConsent: boolean;
  requestedProductSlug: string | null;
  requestedProductName: string | null;
  requestedFlavorText: string | null;
  flavorProfile: FlavorProfile | null;
  quantity: number;
  quantityUnit: QuantityUnit;
  gallonEquivalent: number;
  preferredMarketId: string;
  needByDate: Date | null;
  notes: string | null;
  requestSource: RequestSource;
  status: RequestStatus;
  linkedBatchId: string | null;
  ownerNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Batch campaign
// ---------------------------------------------------------------------------

export type BatchType =
  | 'shared_standard'
  | 'market_supported'
  | 'dedicated_microbatch'
  | 'market_only';

export type BatchStatus =
  | 'collecting_interest'
  | 'owner_review'
  | 'awaiting_minimum'
  | 'confirmed'
  | 'reservations_open'
  | 'fully_reserved'
  | 'in_production'
  | 'available_at_market'
  | 'sold_out'
  | 'completed'
  | 'deferred'
  | 'canceled';

export interface BatchCampaign {
  id: string;
  publicName: string;
  internalFlavorKey: string;
  productSlug: string | null;
  productCategory: ProductCategory | null;
  batchType: BatchType;
  targetGallons: number;
  reservedGallons: number;
  expectedMarketGallons: number;
  samplingOunces: number;
  actualYieldOunces: number | null;
  processLossPercentage: number;
  productionDate: Date;
  marketId: string;
  requestCutoff: Date;
  reservationCutoff: Date;
  shelfLifeEnd: Date | null;
  marketSafe: boolean;
  ingredientAvailability: boolean;
  ownerApproved: boolean;
  standardGallonPriceCents: number;
  setupFeeCents: number;
  depositPercent: number;
  status: BatchStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Reservation
// ---------------------------------------------------------------------------

export type ReservationPaymentStatus =
  | 'pending'
  | 'deposit_paid'
  | 'fully_paid'
  | 'failed'
  | 'refunded'
  | 'canceled';

export type ReservationPickupStatus =
  | 'pending'
  | 'ready'
  | 'picked_up'
  | 'no_show';

export interface BatchReservation {
  id: string;
  requestId: string;
  batchId: string;
  customerEmail: string;
  quantity: number;
  quantityUnit: QuantityUnit;
  gallonEquivalent: number;
  standardPriceCents: number;
  setupFeeCents: number;
  depositCents: number;
  balanceDueCents: number;
  finalPriceCents: number;
  squarePaymentLinkId: string | null;
  squareOrderId: string | null;
  paymentUrl: string | null;
  paymentStatus: ReservationPaymentStatus;
  pickupStatus: ReservationPickupStatus;
  marketId: string;
  confirmationSentAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Decision engine
// ---------------------------------------------------------------------------

export type DecisionPath =
  | 'shared_standard'
  | 'market_supported'
  | 'dedicated_microbatch'
  | 'collect_demand'
  | 'owner_review';

export interface BatchDecision {
  path: DecisionPath;
  reason: string;
  recommendedBatchType: BatchType | null;
  setupFeeCents: number;
  standardGallonPriceCents: number;
  depositPercent: number;
  requiresOwnerApproval: boolean;
  notes: string;
}

// ---------------------------------------------------------------------------
// Owner configuration defaults
// ---------------------------------------------------------------------------

export interface BatchOwnerConfig {
  standardBatchSizeGallons: number;
  sharedBatchThresholdGallons: number;
  processLossPercentage: number;
  samplingOunces: number;
  maxWeeklyMicrobatches: number;
  depositPercent: number;
  setupFeeCentsLemonade: number;
  setupFeeCentsJuice: number;
  setupFeeCentsRefresher: number;
  marketSafeCoreFlavors: string[];
}

export const DEFAULT_BATCH_OWNER_CONFIG: BatchOwnerConfig = {
  standardBatchSizeGallons: 5,
  sharedBatchThresholdGallons: 3,
  processLossPercentage: 0.08,
  samplingOunces: 16,
  maxWeeklyMicrobatches: 3,
  depositPercent: 0.5,
  setupFeeCentsLemonade: 3500,
  setupFeeCentsJuice: 3500,
  setupFeeCentsRefresher: 4000,
  marketSafeCoreFlavors: [
    'kissed-by-gods',
    'calm-waters',
    'strawberry-bliss',
    'supplemint',
  ],
};

// ---------------------------------------------------------------------------
// Customer-facing status mapping
// ---------------------------------------------------------------------------

export const REQUEST_STATUS_CUSTOMER_COPY: Record<RequestStatus, string> = {
  requested: 'We received your request.',
  collecting_demand: 'We are collecting more requests for this flavor.',
  owner_review: 'We are reviewing the details.',
  awaiting_threshold: 'More demand is needed before we can schedule this batch.',
  approved: 'This batch is approved. Check your email to reserve and pay.',
  reservation_offered: 'Your reservation is ready — check your email.',
  deposit_pending: 'Your reservation is waiting on payment.',
  confirmed: 'Your batch is confirmed.',
  in_production: 'Your batch is being prepared.',
  market_available: 'Available for pickup at the market.',
  fully_reserved: 'This batch is fully reserved.',
  sold_out: 'This batch is sold out.',
  completed: 'Thank you — your batch is complete.',
  deferred: 'Moved to a future batch.',
  canceled: 'This request was canceled.',
};

export function customerStatusCopy(status: RequestStatus): string {
  return REQUEST_STATUS_CUSTOMER_COPY[status] ?? 'We are working on your request.';
}
