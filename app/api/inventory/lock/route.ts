export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

/**
 * Retired: this public legacy endpoint allowed client-controlled stock locks,
 * confirmation, or release independently of a Square verified checkout.
 * It was not atomic across orders; confirming also decremented stock without
 * proof of captured payment. Inventory now changes only through the
 * transactionally guarded server checkout and signed provider reconciliation.
 */
export async function POST() {
  return NextResponse.json({
    success: false,
    code: 'LEGACY_INVENTORY_MUTATION_RETIRED',
    error: 'This inventory endpoint is no longer supported. Please use the standard checkout flow.',
  }, { status: 410 });
}
