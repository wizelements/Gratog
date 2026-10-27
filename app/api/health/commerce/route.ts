export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSquareHealthStatus } from '@/lib/payments/config';
import { getStorefrontCatalogSnapshot } from '@/lib/storefront-products';
import { isApprovedLemonadeLine } from '@/lib/lemonade-packs';
import { isolatedSandboxPreviewEnabled } from '@/lib/catalog-environment';

/**
 * Non-sensitive commerce readiness signal.
 * A running process or reachable MongoDB does not mean customers can buy.
 * Does NOT authorize payments or replace a real browser/Square E2E test.
 */
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const payment = getSquareHealthStatus();
    const snapshot = await getStorefrontCatalogSnapshot({});
    const approvedFlavors = new Set<string>();
    for (const product of snapshot.products) {
      if (product.checkoutReady !== true || product.inStock === false ||
          product.available === false || product.soldOut === true ||
          product.squareIsArchived === true || product.squareEcomAvailable === false) continue;
      const variations = Array.isArray(product.variations) ? product.variations : [];
      const hasApprovedVariation = variations.some((variation: any) =>
        Boolean(variation.id) && isApprovedLemonadeLine({
          ...product,
          unitPriceCents: Math.round(Number(variation.price ?? product.price) * 100),
          subtitle: variation.name,
        })
      );
      if (hasApprovedVariation) approvedFlavors.add(String(product.slug || product.name || product.id));
    }
    const isPreview = process.env.VERCEL_ENV === 'preview';
    const checks = {
      squareConfiguration: payment.ok,
      signedWebhookConfigured: Boolean(process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim()),
      correctSquareEnvironment: !isPreview || payment.environment === 'sandbox',
      previewCatalogIsolation: !isPreview || isolatedSandboxPreviewEnabled(),
      liveCatalog: snapshot.isFallback === false && snapshot.source === 'unified_storefront',
      mixedPackAvailability: approvedFlavors.size >= 2,
    };
    const ready = Object.values(checks).every(Boolean);
    return NextResponse.json({
      service: 'commerce', ready, checks,
      catalogSource: snapshot.source,
      availableLemonadeFlavors: approvedFlavors.size,
      squareEnvironment: payment.environment,
      timestamp: new Date().toISOString(),
      // No credentials, customer records, private stock counts or hostnames.
    }, { status: ready ? 200 : 503, headers });
  } catch {
    return NextResponse.json({ service: 'commerce', ready: false,
      checks: { squareConfiguration: false, liveCatalog: false },
      error: 'Commerce readiness unavailable', timestamp: new Date().toISOString(),
    }, { status: 503, headers });
  }
}
