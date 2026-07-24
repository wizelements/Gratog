/**
 * Fresh Batch Request System — state-machine transition guards
 *
 * Server-side enforcement for request, batch campaign, and reservation
 * status transitions. Every invalid transition is rejected before any
 * write or side effect occurs.
 */

import type {
  BatchCampaign,
  BatchReservation,
  FreshBatchRequest,
  RequestStatus,
  BatchStatus,
  ReservationPaymentStatus,
} from './types';

// ============================================================================
// Flavor request transitions
// ============================================================================

const REQUEST_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  requested: ['collecting_demand', 'owner_review', 'awaiting_threshold', 'approved', 'canceled'],
  collecting_demand: ['awaiting_threshold', 'owner_review', 'approved', 'deferred', 'canceled'],
  awaiting_threshold: ['collecting_demand', 'owner_review', 'approved', 'deferred', 'canceled'],
  owner_review: ['approved', 'awaiting_threshold', 'deferred', 'canceled'],
  approved: ['reservation_offered', 'in_production', 'deferred', 'canceled'],
  reservation_offered: ['deposit_pending', 'confirmed', 'canceled'],
  deposit_pending: ['confirmed', 'canceled'],
  confirmed: ['in_production', 'market_available', 'completed', 'canceled'],
  in_production: ['market_available', 'sold_out', 'completed', 'canceled'],
  market_available: ['sold_out', 'completed', 'canceled'],
  fully_reserved: ['in_production', 'canceled'],
  sold_out: ['completed'],
  completed: [],
  deferred: ['requested', 'collecting_demand', 'canceled'],
  canceled: [],
};

export function isValidRequestTransition(
  from: RequestStatus,
  to: RequestStatus
): boolean {
  if (from === to) return true;
  return REQUEST_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidRequestTransitions(from: RequestStatus): RequestStatus[] {
  return REQUEST_TRANSITIONS[from] ?? [];
}

// ============================================================================
// Batch campaign transitions
// ============================================================================

const BATCH_TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  collecting_interest: ['owner_review', 'awaiting_minimum', 'confirmed', 'deferred', 'canceled'],
  owner_review: ['awaiting_minimum', 'confirmed', 'canceled'],
  awaiting_minimum: ['collecting_interest', 'confirmed', 'deferred', 'canceled'],
  confirmed: ['reservations_open', 'in_production', 'canceled'],
  reservations_open: ['fully_reserved', 'in_production', 'canceled'],
  fully_reserved: ['in_production', 'canceled'],
  in_production: ['available_at_market', 'sold_out', 'completed', 'canceled'],
  available_at_market: ['sold_out', 'completed', 'canceled'],
  sold_out: [],
  completed: [],
  deferred: ['collecting_interest', 'canceled'],
  canceled: [],
};

export function isValidBatchTransition(
  from: BatchStatus,
  to: BatchStatus
): boolean {
  if (from === to) return true;
  return BATCH_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidBatchTransitions(from: BatchStatus): BatchStatus[] {
  return BATCH_TRANSITIONS[from] ?? [];
}

// ============================================================================
// Reservation payment-status transitions
// ============================================================================

const RESERVATION_PAYMENT_TRANSITIONS: Record<ReservationPaymentStatus, ReservationPaymentStatus[]> = {
  pending: ['deposit_paid', 'fully_paid', 'failed', 'canceled'],
  deposit_paid: ['fully_paid', 'refunded', 'canceled'],
  fully_paid: ['refunded', 'canceled'],
  failed: ['pending', 'canceled'],
  refunded: [],
  canceled: [],
};

export function isValidReservationPaymentTransition(
  from: ReservationPaymentStatus,
  to: ReservationPaymentStatus
): boolean {
  if (from === to) return true;
  return RESERVATION_PAYMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidReservationPaymentTransitions(
  from: ReservationPaymentStatus
): ReservationPaymentStatus[] {
  return RESERVATION_PAYMENT_TRANSITIONS[from] ?? [];
}

// ============================================================================
// Conditions that must be met for certain transitions
// ============================================================================

export interface BatchApprovalConditions {
  hasPrice: boolean;
  hasMarketId: boolean;
  hasProductionDate: boolean;
  ingredientAvailable?: boolean;
  ownerApproved?: boolean;
}

export function canApproveBatch(conditions: BatchApprovalConditions): {
  ok: boolean;
  reason?: string;
} {
  if (!conditions.hasPrice) {
    return { ok: false, reason: 'Batch requires a verified price before approval' };
  }
  if (!conditions.hasMarketId) {
    return { ok: false, reason: 'Batch requires a market assignment before approval' };
  }
  if (!conditions.hasProductionDate) {
    return { ok: false, reason: 'Batch requires a production date before approval' };
  }
  if (conditions.ingredientAvailable === false) {
    return { ok: false, reason: 'Required ingredient is unavailable' };
  }
  return { ok: true };
}

export function canOpenReservations(batchStatus: BatchStatus): {
  ok: boolean;
  reason?: string;
} {
  if (batchStatus !== 'confirmed') {
    return { ok: false, reason: 'Reservations can only open after batch is confirmed' };
  }
  return { ok: true };
}

export function canCreatePaymentLink(batchStatus: BatchStatus): {
  ok: boolean;
  reason?: string;
} {
  if (!['confirmed', 'reservations_open', 'fully_reserved'].includes(batchStatus)) {
    return { ok: false, reason: 'Payment links can only be created for a confirmed batch' };
  }
  return { ok: true };
}

export function canCancelBatch(
  batchStatus: BatchStatus,
  hasPaidReservations: boolean
): { ok: boolean; reason?: string } {
  if (['completed', 'sold_out', 'canceled'].includes(batchStatus)) {
    return { ok: false, reason: 'Batch is already terminal' };
  }
  if (hasPaidReservations) {
    return { ok: false, reason: 'Canceling a batch with paid reservations requires refund/credit records' };
  }
  return { ok: true };
}

export function canTransitionToInProduction(batch: BatchCampaign): {
  ok: boolean;
  reason?: string;
} {
  if (!batch.ownerApproved) {
    return { ok: false, reason: 'Batch must be owner-approved before production' };
  }
  if (batch.ingredientAvailability === false) {
    return { ok: false, reason: 'Required ingredient is unavailable' };
  }
  if (batch.productionDate < new Date()) {
    return { ok: false, reason: 'Production date cannot be in the past' };
  }
  return { ok: true };
}
