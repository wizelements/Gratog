export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

/**
 * DEPRECATED — parallel payment processing path.
 * Canonical flow: POST /api/orders/create → POST /api/payments.
 * Removed to eliminate revenue risk R-H2 (parallel payment paths competing).
 */
function gone() {
  return new NextResponse(
    JSON.stringify({
      success: false,
      error: 'This endpoint is no longer available. Use /api/payments.',
      code: 'PAY_PROCESS_DEPRECATED',
    }),
    {
      status: 410,
      headers: {
        'Content-Type': 'application/json',
        'Deprecation': 'true',
        'Sunset': 'Sat, 31 May 2026 00:00:00 GMT',
        'Link': '</api/payments>; rel="successor-version"',
      },
    }
  );
}

export async function GET() { return gone(); }
export async function POST() { return gone(); }
export async function PUT() { return gone(); }
export async function DELETE() { return gone(); }
