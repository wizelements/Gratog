export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import { rateLimitByIp } from '@/lib/rate-limit';
import { getProductBySlug } from '@/lib/batches/pricing';
import {
  normalizeRequestInput,
  containsHealthClaims,
  sanitizeNotes,
  type FreshBatchRequestInput,
} from '@/lib/batches/validation';
import { toGallonEquivalent } from '@/lib/batches/quantity-converter';
import {
  createRequest,
  hasRecentDuplicateRequest,
} from '@/lib/batches/repository';
import { sendRequestReceivedEmail } from '@/lib/batches/email-templates';
import { sendOwnerAlert } from '@/lib/owner-alerts';
import type { FreshBatchRequest } from '@/lib/batches/types';

/**
 * Create a fresh batch request.
 *
 * This route does not collect payment. It persists the request, sends a
 * transactional confirmation to the customer, and alerts the owner via the
 * existing Telegram/Resend owner-alert path.
 */
export async function POST(request: NextRequest) {
  // Apply a lightweight per-IP rate limit.
  const rate = await rateLimitByIp(request, 10, 60 * 1000);
  if (!rate.ok) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again in a minute.' },
      { status: 429, headers: rate.headers }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const parsed = normalizeRequestInput(raw);

  // Reject health-claim language in notes before persisting.
  if (parsed.notes && containsHealthClaims(parsed.notes)) {
    return NextResponse.json(
      { success: false, error: 'Notes cannot include medical or health-outcome claims. Please describe the flavor or experience you are looking for.' },
      { status: 400 }
    );
  }

  // Dedupe recent identical requests within 24 hours.
  const isDuplicate = await hasRecentDuplicateRequest(
    parsed.email,
    parsed.requestedProductSlug || null,
    parsed.flavorProfile || null,
    24 * 60 * 60 * 1000
  );
  if (isDuplicate) {
    return NextResponse.json(
      { success: true, persisted: true, message: 'We already have this request from you. We will email updates as the batch forms.' },
      { status: 200 }
    );
  }

  const product = parsed.requestedProductSlug
    ? getProductBySlug(parsed.requestedProductSlug)
    : null;

  const requestDoc: Omit<FreshBatchRequest, 'id' | 'createdAt' | 'updatedAt'> = {
    email: parsed.email,
    phone: parsed.phone?.trim() || null,
    smsConsent: parsed.smsConsent,
    marketingEmailConsent: parsed.marketingEmailConsent,
    requestedProductSlug: parsed.requestedProductSlug || null,
    requestedProductName: product?.name ?? null,
    requestedFlavorText: parsed.requestedFlavorText?.trim() || null,
    flavorProfile: parsed.flavorProfile || null,
    quantity: parsed.quantity,
    quantityUnit: parsed.quantityUnit,
    gallonEquivalent: toGallonEquivalent(parsed.quantity, parsed.quantityUnit),
    preferredMarketId: parsed.preferredMarketId,
    needByDate: parsed.needByDate || null,
    notes: sanitizeNotes(parsed.notes),
    requestSource: parsed.requestSource,
    status: 'requested',
    linkedBatchId: null,
    ownerNotes: null,
  };

  try {
    const persisted = await createRequest(requestDoc);

    // Send transactional email (best-effort; do not fail the request if email fails).
    try {
      const marketName = getMarketDisplayName(persisted.preferredMarketId);
      await sendRequestReceivedEmail({
        requestId: persisted.id,
        email: persisted.email,
        productName: persisted.requestedProductName,
        flavorProfile: persisted.flavorProfile,
        flavorText: persisted.requestedFlavorText,
        quantity: formatQuantity(persisted.quantity, persisted.quantityUnit),
        marketName,
        status: persisted.status,
      });
    } catch (emailError) {
      logger.warn('FreshBatchRequest', 'Request persisted but confirmation email failed', {
        requestId: persisted.id,
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }

    // Notify owner (best-effort).
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tasteofgratitude.shop';
      await sendOwnerAlert({
        sourceEventId: `freshbatch:request:${persisted.id}`,
        category: 'fresh_batch',
        severity: 'info',
        title: `New fresh batch request: ${persisted.requestedProductName || persisted.flavorProfile || 'custom flavor'}`,
        body: `${persisted.email} requested ${formatQuantity(persisted.quantity, persisted.quantityUnit)} for ${getMarketDisplayName(persisted.preferredMarketId)}. Review in the admin inbox.`,
        actionUrl: `${baseUrl}/admin/fresh-batches`,
        channel: 'all',
        eventAt: new Date().toISOString(),
        metadata: {
          requestId: persisted.id,
          email: persisted.email,
          flavor: persisted.requestedProductName || persisted.flavorProfile || persisted.requestedFlavorText,
          marketId: persisted.preferredMarketId,
          gallonEquivalent: persisted.gallonEquivalent,
        },
      });
    } catch (alertError) {
      logger.warn('FreshBatchRequest', 'Owner alert failed', {
        requestId: persisted.id,
        error: alertError instanceof Error ? alertError.message : String(alertError),
      });
    }

    return NextResponse.json(
      {
        success: true,
        persisted: true,
        requestId: persisted.id,
        status: persisted.status,
        message: customerMessage(persisted.status),
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('FreshBatchRequest', 'Failed to persist fresh batch request', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: 'We could not save your request. Please try again shortly.' },
      { status: 503 }
    );
  }
}

function getMarketDisplayName(marketId: string): string {
  const names: Record<string, string> = {
    serenbe: 'Serenbe Farmers Market',
    dunwoody: 'Dunwoody Farmers Market',
  };
  return names[marketId] || marketId;
}

function formatQuantity(quantity: number, unit: string): string {
  const labels: Record<string, string> = {
    bottle_16oz: 'one 16 oz bottle',
    multi_bottle: `${quantity} 16 oz bottles`,
    half_gallon: 'half gallon',
    gallon: 'one gallon',
    two_gallons: 'two gallons',
    three_plus_gallons: `${quantity} gallons`,
    sample_interest: 'market samples',
  };
  return labels[unit] || `${quantity} ${unit}`;
}

function customerMessage(status: FreshBatchRequest['status']): string {
  const messages: Record<string, string> = {
    requested: 'Request received. We will email you once the batch is approved.',
    collecting_demand: 'We are collecting more demand for this flavor before scheduling a batch.',
    owner_review: 'We are reviewing the details and will confirm by email.',
    awaiting_threshold: 'More demand is needed before we can schedule this batch.',
  };
  return messages[status] || 'We received your request.';
}
