import { NextRequest, NextResponse } from 'next/server';
import { getSquareClient, getSquareLocationId } from '@/lib/square';
import { toSquareMoney, fromSquareMoney } from '@/lib/money';
import { logger } from '@/lib/logger';

/**
 * Cart Pricing API - Server-Side Authoritative Pricing
 * Calculates cart totals using Square Catalog as source of truth
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lines } = body; // Array of { variationId, qty }

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: 'Cart lines are required' },
        { status: 400 }
      );
    }

    logger.debug('Cart', 'Calculating cart price', { lines });

    // Get fresh Square client instance
    const square = getSquareClient();

    // Fetch current prices from Square Catalog
    const variationIds = lines.map(line => line.variationId);
    const catalogResponse = await square.catalog.batchGet({
      objectIds: variationIds,
      includeRelatedObjects: false
    });

    if (!catalogResponse.objects) {
      return NextResponse.json(
        { error: 'Failed to retrieve catalog items from Square' },
        { status: 500 }
      );
    }

    // Calculate total from Square Catalog prices
    let subtotalCents = 0;
    const lineDetails = [];

    for (const line of lines) {
      const variation = catalogResponse.objects.find(
        (obj) => obj.id === line.variationId
      );

      if (!variation) {
        return NextResponse.json(
          { error: `Variation ${line.variationId} not found in catalog` },
          { status: 400 }
        );
      }

      // Cast to access itemVariationData - Square SDK types don't expose this directly
      const variationData = (variation as { itemVariationData?: { priceMoney?: { amount?: bigint | number }; name?: string } }).itemVariationData;
      const priceMoney = variationData?.priceMoney;
      if (!priceMoney) {
        return NextResponse.json(
          { error: `Price not set for variation ${line.variationId}` },
          { status: 400 }
        );
      }

      const pricePerItemCents = Number(priceMoney.amount);
      const lineTotal = pricePerItemCents * line.qty;
      subtotalCents += lineTotal;

      lineDetails.push({
        variationId: line.variationId,
        name: variationData?.name || 'Unknown',
        qty: line.qty,
        pricePerItemCents,
        lineTotalCents: lineTotal
      });
    }

    // Calculate tax (8% sales tax - consistent with rest of system)
    const taxRate = 0.08;
    const taxCents = Math.round(subtotalCents * taxRate);
    const totalCents = subtotalCents + taxCents;

    return NextResponse.json({
      success: true,
      pricing: {
        subtotalCents,
        taxCents,
        totalCents,
        currency: 'USD'
      },
      lines: lineDetails,
      message: 'Pricing calculated from Square Catalog'
    });

  } catch (error) {
    console.error('Cart pricing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate cart pricing',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
