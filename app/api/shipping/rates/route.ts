export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

/**
 * DEPRECATED — shipping is not offered by this business.
 * OPEE LIVE-05: Shipping removed. Taste of Gratitude does not offer shipping.
 * This endpoint now returns 410 Gone.
 */
function gone() {
  return new NextResponse(
    JSON.stringify({
      success: false,
      error: 'This endpoint is no longer available. Shipping is not offered.',
      code: 'SHIPPING_NOT_OFFERED',
    }),
    {
      status: 410,
      headers: {
        'Content-Type': 'application/json',
        'Deprecation': 'true',
        'Sunset': 'Sat, 31 May 2026 00:00:00 GMT',
      },
    }
  );
}

export async function GET() { return gone(); }
export async function POST() { return gone(); }
export async function PUT() { return gone(); }
export async function DELETE() { return gone(); }