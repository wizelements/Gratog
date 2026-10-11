export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

// Retired: this legacy route accepted a caller-provided amount and could create
// Square checkout links without canonical order pricing, access-token checks,
// or Georgia-only destination verification. It must not issue payments.
function gone() {
  return NextResponse.json(
    {
      success: false,
      code: 'LEGACY_SQUARE_CHECKOUT_RETIRED',
      error: 'This checkout link is no longer supported. Please use the Taste of Gratitude checkout.',
    },
    { status: 410, headers: { Deprecation: 'true', Link: '</checkout>; rel="successor-version"' } }
  );
}

export async function POST() { return gone(); }
export async function GET() { return gone(); }
