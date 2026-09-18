export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getTursoConnection } from '@/lib/db/turso';
import { getActiveMenu } from '@/lib/menus/repository';
import { getCurrentWeekRange } from '@/lib/menus/week-utils';
import { getSquareHealthStatus, getSquareServerConfig } from '@/lib/payments/config';
import { listStorefrontProducts } from '@/lib/repositories/storefront-catalog';
import { validateStorefrontProducts } from '@/lib/storefront-integrity';

const SQUARE_VERSION = '2025-10-16';

export async function GET() {
  const checks: Record<string, unknown> = {};
  const failures: string[] = [];

  let tursoOk = false;
  try {
    await getTursoConnection().get('SELECT 1 AS ok');
    tursoOk = true;
  } catch {
    failures.push('turso');
  }
  checks.turso = { ok: tursoOk };
  let catalog = { ok: false, total: 0, valid: 0, invalid: 0 };
  if (tursoOk) {
    try {
      const products = await listStorefrontProducts();
      const integrity = validateStorefrontProducts(products);
      catalog = {
        ok: products.length > 0 && integrity.invalidReports.length === 0,
        total: products.length,
        valid: integrity.validReports.length,
        invalid: integrity.invalidReports.length,
      };
      if (!catalog.ok) failures.push('catalog');
    } catch {
      failures.push('catalog');
    }
  } else {
    failures.push('catalog');
  }
  checks.catalog = catalog;

  let menuCheck = { ok: false, current: false, linkedProducts: 0, usableLinkedProducts: 0 };
  if (tursoOk) {
    try {
      const menu = await getActiveMenu();
      const { weekStart, weekEnd } = getCurrentWeekRange();
      const current = Boolean(
        menu &&
        new Date(menu.weekStart) <= new Date(weekEnd) &&
        new Date(menu.weekEnd) >= new Date(weekStart)
      );
      const linkedProducts = menu?.linkedProducts?.length ?? 0;
      const catalogRows = await listStorefrontProducts();
      const linkedIds = new Set(menu?.linkedProducts?.map(String) ?? []);
      const usableLinkedProducts = catalogRows.filter((product: any) =>
        linkedIds.has(String(product.id)) &&
        Number(product.price) > 0 &&
        Array.isArray(product.variations) &&
        product.variations.length > 0
      ).length;
      menuCheck = {
        ok: Boolean(menu && current && linkedProducts > 0 && usableLinkedProducts > 0),
        current,
        linkedProducts,
        usableLinkedProducts,
      };
    } catch {
      menuCheck = { ok: false, current: false, linkedProducts: 0, usableLinkedProducts: 0 };
    }
  }
  if (!menuCheck.ok) failures.push('weekly_menu');
  checks.weeklyMenu = menuCheck;

  const squareConfig = getSquareHealthStatus();
  let squareApiOk = false;
  if (squareConfig.ok) {
    try {
      const config = getSquareServerConfig();
      const response = await fetch(
        `${config.baseUrl}/v2/locations/${config.locationId}`,
        {
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            'Square-Version': SQUARE_VERSION,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000),
          cache: 'no-store',
        }
      );
      squareApiOk = response.ok;
    } catch {
      squareApiOk = false;
    }
  }
  if (!squareConfig.ok || !squareApiOk) failures.push('square');
  checks.square = {
    ok: squareConfig.ok && squareApiOk,
    configured: squareConfig.ok,
    api: squareApiOk,
    environment: squareConfig.environment,
  };

  const resendOk = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
  if (!resendOk) failures.push('resend');
  checks.resend = { ok: resendOk };
  // Transitional dependency: legacy runtime paths still use Mongo.
  const legacyMongoConfigured = Boolean(process.env.MONGODB_URI);
  if (!legacyMongoConfigured) failures.push('legacy_mongo_runtime');
  checks.legacyMongoRuntime = {
    ok: legacyMongoConfigured,
    transitional: true,
    note: 'Required until remaining Mongo runtime paths are converted.',
  };

  const blockers = [...new Set(failures)];
  const ready = blockers.length === 0;

  return NextResponse.json(
    {
      service: 'commerce-readiness',
      ready,
      status: ready ? 'ready' : 'blocked',
      timestamp: new Date().toISOString(),
      checks,
      blockers,
    },
    {
      status: ready ? 200 : 503,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    }
  );
}
