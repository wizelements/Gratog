export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * GET /api/customer/profile?phone=xxx
 * Disabled until customer authentication is connected. Phone-number lookup
 * alone is not sufficient authorization to disclose account or order data.
 */
export async function GET(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Customer account access is temporarily unavailable.' },
    { status: 503 }
  );
}
