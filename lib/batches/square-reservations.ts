/**
 * Fresh Batch Request System — Square reservation link creation
 *
 * Creates an owner-confirmed Square payment link for a batch reservation.
 * Prices are server-side only. Catalog IDs are used only when valid.
 */

import {
  createPaymentLink,
  type CreatePaymentLinkRequest,
  type OrderLineItem,
} from '@/lib/square-api';
import { getProductBySlug } from './pricing';
import type { BatchReservation } from './types';

export interface ReservationLinkInput {
  reservation: Pick<BatchReservation, 'id' | 'customerEmail' | 'quantity' | 'quantityUnit' | 'gallonEquivalent' | 'finalPriceCents' | 'depositCents' | 'balanceDueCents' | 'setupFeeCents' | 'marketId'>;
  batchName: string;
  productSlug: string | null;
  productionDate: Date;
  redirectUrl?: string;
}

function unitLabel(quantityUnit: string): string {
  const labels: Record<string, string> = {
    jar_16oz: '16 oz jar',
    bottle_16oz: '16 oz bottle',
    multi_bottle: '16 oz bottles',
    half_gallon: 'half gallon',
    gallon: 'gallon',
    two_gallons: 'gallons',
    three_plus_gallons: 'gallons',
    sample_interest: 'market samples',
  };
  return labels[quantityUnit] || quantityUnit;
}

/**
 * Build a Square payment link for a batch reservation.
 *
 * The line item is intentionally ad-hoc unless a verified Square catalog
 * variation ID exists. The reservation price is the authority; any Square
 * catalog mapping is used only for SKU reconciliation, never for pricing.
 */
export async function createReservationPaymentLink(
  input: ReservationLinkInput
): Promise<{ success: true; squarePaymentLinkId: string; paymentUrl: string; squareOrderId?: string } | { success: false; errors: string[] }> {
  const { reservation, batchName, productSlug, productionDate, redirectUrl } = input;

  // Never create a payable Square link without a valid owner-approved money amount.
  if (!Number.isSafeInteger(reservation.finalPriceCents) || reservation.finalPriceCents <= 0) {
    return { success: false, errors: ['Reservation price must be greater than zero'] };
  }
  if (!Number.isSafeInteger(reservation.depositCents) || reservation.depositCents < 0 ||
      reservation.depositCents > reservation.finalPriceCents) {
    return { success: false, errors: ['Invalid reservation deposit amount'] };
  }
  if (!Number.isSafeInteger(reservation.balanceDueCents) ||
      reservation.balanceDueCents !== reservation.finalPriceCents - reservation.depositCents) {
    return { success: false, errors: ['Reservation balance does not match approved price'] };
  }
  if (!Number.isInteger(reservation.quantity) || reservation.quantity <= 0) {
    return { success: false, errors: ['Reservation quantity must be a positive whole number'] };
  }
  // The first checkout collects the approved deposit (or full amount when no
  // deposit is specified). Never multiply an already-computed total by units.
  const chargeNowCents = reservation.depositCents > 0 ? reservation.depositCents : reservation.finalPriceCents;

  const product = productSlug ? getProductBySlug(productSlug) : null;
  const lineItemName = product?.name
    ? `${product.name} — ${batchName}`
    : batchName;
  const label = unitLabel(reservation.quantityUnit);
  const plural = reservation.quantity > 1 && ['jar_16oz', 'bottle_16oz', 'half_gallon', 'gallon'].includes(reservation.quantityUnit) ? 's' : '';
  const itemDescription = `${reservation.quantity} ${label}${plural}`;

  const lineItems: OrderLineItem[] = [
    {
      name: `${lineItemName} (${itemDescription})`,
      quantity: '1', // one reservation; amount is already the total for all units
      basePriceMoney: {
        amount: chargeNowCents,
        currency: 'USD',
      },
      // Ad-hoc item: no unverified catalog variation ID.
      note: `Fresh batch reservation. Full total: ${(reservation.finalPriceCents / 100).toFixed(2)}. Due now: ${(chargeNowCents / 100).toFixed(2)}. Balance after payment: ${((reservation.finalPriceCents - chargeNowCents) / 100).toFixed(2)}. Production date: ${productionDate.toISOString().split('T')[0]}`,
    },
  ];

  const linkReq: CreatePaymentLinkRequest = {
    referenceId: `freshbatch_reservation_${reservation.id}`,
    idempotencyKey: `freshbatch_reservation_${reservation.id}`,
    description: `Reservation for ${batchName}`,
    lineItems,
    buyerEmail: reservation.customerEmail,
    metadata: {
      reservationId: reservation.id,
      batchName,
      marketId: reservation.marketId,
      source: 'fresh_batch_reservation',
      paymentPhase: chargeNowCents < reservation.finalPriceCents ? 'deposit' : 'full',
    },
  };

  if (redirectUrl) {
    linkReq.redirectUrl = redirectUrl;
  }

  const result = await createPaymentLink(linkReq);
  if (!result.success || !result.data?.paymentLink) {
    return {
      success: false,
      errors: result.errors?.map((e) => e.detail) || ['Square payment link creation failed'],
    };
  }

  return {
    success: true,
    squarePaymentLinkId: result.data.paymentLink.id,
    paymentUrl: result.data.paymentLink.url,
    squareOrderId: result.data.paymentLink.orderId,
  };
}
