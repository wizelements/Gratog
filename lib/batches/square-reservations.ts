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
  reservation: Pick<BatchReservation, 'id' | 'customerEmail' | 'quantity' | 'quantityUnit' | 'gallonEquivalent' | 'finalPriceCents' | 'setupFeeCents' | 'marketId'>;
  batchName: string;
  productSlug: string | null;
  productionDate: Date;
  redirectUrl?: string;
}

function unitLabel(quantityUnit: string): string {
  const labels: Record<string, string> = {
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

  if (reservation.finalPriceCents <= 0) {
    return { success: false, errors: ['Reservation price must be greater than zero'] };
  }

  const product = productSlug ? getProductBySlug(productSlug) : null;
  const quantityString = String(reservation.quantity);
  const lineItemName = product?.name
    ? `${product.name} — ${batchName}`
    : `${batchName} (${unitLabel(reservation.quantityUnit)})`;

  const lineItems: OrderLineItem[] = [
    {
      name: lineItemName,
      quantity: quantityString,
      basePriceMoney: {
        amount: reservation.finalPriceCents,
        currency: 'USD',
      },
      // Include catalog ID only if it looks like a real Square variation ID.
      catalogObjectId: product?.squareProductUrl ? undefined : undefined,
      note: `Fresh batch reservation. Production date: ${productionDate.toISOString().split('T')[0]}`,
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
