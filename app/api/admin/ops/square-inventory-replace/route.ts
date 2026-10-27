import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthError, requireAdminSession } from '@/lib/auth/unified-admin';

export const dynamic = 'force-dynamic';

// Retired: this endpoint replaced physical stock with hardcoded quantities.
// A stock correction requires an observed count, location and durable audit.
async function retired(request: NextRequest) {
  try {
    await requireAdminSession(request);
    return NextResponse.json({ success: false, code: 'UNVERIFIED_STOCK_REPLACEMENT_RETIRED',
      error: 'Record a verified physical count through the inventory reconciliation process.' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Administrator authentication required' },
      { status: error instanceof AdminAuthError ? error.statusCode : 503,
        headers: { 'Cache-Control': 'no-store' } });
  }
}
export const GET = retired;
export const POST = retired;
