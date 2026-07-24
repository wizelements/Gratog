export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/unified-admin';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import { findRequestById, createReservation, findBatchCampaignById } from '@/lib/batches/repository';
import { calculateReservationPrice, setupFeeCents, standardGallonPriceCents } from '@/lib/batches/pricing';
import { toGallonEquivalent } from '@/lib/batches/quantity-converter';
import { createReservationPaymentLink } from '@/lib/batches/square-reservations';
import { sendBatchConfirmedEmail } from '@/lib/batches/email-templates';
import type { BatchReservation } from '@/lib/batches/types';

/**
 * Admin endpoint: create a reservation + Square payment link for a request.
 *
 * POST /api/admin/fresh-batch/reservations
 * Body: { requestId, batchId, depositPercent?, setupFeeCents?, standardGallonPriceCents? }
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const body = raw as {
    requestId?: string;
    batchId?: string;
    depositPercent?: number;
    setupFeeCents?: number;
    standardGallonPriceCents?: number;
  };

  if (!body.requestId || !body.batchId) {
    return NextResponse.json(
      { success: false, error: 'requestId and batchId are required' },
      { status: 400 }
    );
  }

  try {
    const freshRequest = await findRequestById(body.requestId);
    if (!freshRequest) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }

    const batch = await findBatchCampaignById(body.batchId);
    if (!batch) {
      return NextResponse.json(
        { success: false, error: 'Batch not found' },
        { status: 404 }
      );
    }

    const gallonEquivalent = toGallonEquivalent(freshRequest.quantity, freshRequest.quantityUnit);
    const standardPrice =
      body.standardGallonPriceCents ??
      batch.standardGallonPriceCents ??
      standardGallonPriceCents(freshRequest.requestedProductSlug || '') ??
      0;
    const setupFee =
      body.setupFeeCents ??
      batch.setupFeeCents ??
      setupFeeCents(freshRequest.requestedProductSlug, batch.productCategory);
    const depositPercent = body.depositPercent ?? batch.depositPercent ?? 0.5;

    if (standardPrice <= 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot create reservation without a verified price' },
        { status: 400 }
      );
    }

    const { finalPriceCents, depositCents, balanceDueCents } = calculateReservationPrice(
      gallonEquivalent,
      standardPrice,
      setupFee,
      depositPercent
    );

    const reservationData: Omit<BatchReservation, 'id' | 'createdAt' | 'updatedAt'> = {
      requestId: freshRequest.id,
      batchId: batch.id,
      customerEmail: freshRequest.email,
      quantity: freshRequest.quantity,
      quantityUnit: freshRequest.quantityUnit,
      gallonEquivalent,
      standardPriceCents: standardPrice,
      setupFeeCents: setupFee,
      depositCents,
      balanceDueCents,
      finalPriceCents,
      squarePaymentLinkId: null,
      squareOrderId: null,
      paymentUrl: null,
      paymentStatus: 'pending',
      pickupStatus: 'pending',
      marketId: batch.marketId,
      confirmationSentAt: null,
      completedAt: null,
    };

    const reservation = await createReservation(reservationData);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tasteofgratitude.shop';
    const linkResult = await createReservationPaymentLink({
      reservation,
      batchName: batch.publicName,
      productSlug: batch.productSlug || freshRequest.requestedProductSlug,
      productionDate: batch.productionDate,
      redirectUrl: `${baseUrl}/order/success?reservation=${reservation.id}`,
    });

    if (!linkResult.success) {
      return NextResponse.json(
        { success: false, error: 'Square payment link creation failed', details: linkResult.errors },
        { status: 502 }
      );
    }

    // Update reservation with Square link.
    const { db } = await connectToDatabase();
    await db.collection('batch_reservations').updateOne(
      { id: reservation.id },
      {
        $set: {
          squarePaymentLinkId: linkResult.squarePaymentLinkId,
          squareOrderId: linkResult.squareOrderId,
          paymentUrl: linkResult.paymentUrl,
          updatedAt: new Date(),
        },
      }
    );

    // Send customer confirmation email.
    try {
      await sendBatchConfirmedEmail({
        requestId: freshRequest.id,
        email: freshRequest.email,
        batchName: batch.publicName,
        productName: freshRequest.requestedProductName,
        flavorProfile: freshRequest.flavorProfile,
        flavorText: freshRequest.requestedFlavorText,
        quantity: `${freshRequest.quantity} ${freshRequest.quantityUnit.replace(/_/g, ' ')}`,
        marketName: batch.marketId,
        productionDate: batch.productionDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        }),
        reservationUrl: linkResult.paymentUrl,
        finalPriceCents,
        depositCents,
        setupFeeCents: setupFee,
      });
    } catch (emailError) {
      logger.warn('FreshBatchReservation', 'Reservation created but confirmation email failed', {
        reservationId: reservation.id,
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          reservationId: reservation.id,
          paymentUrl: linkResult.paymentUrl,
          squarePaymentLinkId: linkResult.squarePaymentLinkId,
          finalPriceCents,
          depositCents,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('FreshBatchReservation', 'Failed to create reservation', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: 'Failed to create reservation' },
      { status: 500 }
    );
  }
}
