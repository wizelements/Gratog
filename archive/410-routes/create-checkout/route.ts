export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

/**
 * DEPRECATED — parallel checkout path. See app/api/checkout/route.ts.
 * Canonical flow: POST /api/orders/create → POST /api/payments.
 */
function gone() {
  return new NextResponse(
    JSON.stringify({
      success: false,
      error: 'This endpoint is no longer available. Use /api/orders/create then /api/payments.',
      code: 'CHECKOUT_PATH_DEPRECATED',
    }),
    {
      status: 410,
      headers: {
        'Content-Type': 'application/json',
        'Deprecation': 'true',
        'Sunset': 'Sat, 31 May 2026 00:00:00 GMT',
        'Link': '</api/orders/create>; rel="successor-version"',
      },
    }
  );
}

export async function GET() { return gone(); }
export async function POST() { return gone(); }
export async function PUT() { return gone(); }
export async function DELETE() { return gone(); }
