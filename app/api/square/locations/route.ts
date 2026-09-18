import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SQUARE_VERSION = '2025-10-16';

export async function GET() {
  try {
    const token = process.env.SQUARE_ACCESS_TOKEN?.trim();
    const environment = (process.env.SQUARE_ENVIRONMENT || 'production').trim().toLowerCase();

    if (!token) {
      return NextResponse.json({ error: 'SQUARE_ACCESS_TOKEN not configured' }, { status: 500 });
    }

    const baseUrl = environment === 'sandbox'
      ? 'https://connect.squareupsandbox.com'
      : 'https://connect.squareup.com';

    const response = await fetch(`${baseUrl}/v2/locations`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Square-Version': SQUARE_VERSION,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const body = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: `Square API error: ${response.status}`, detail: body },
        { status: response.status }
      );
    }

    return NextResponse.json(body.locations || [], {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Square locations request failed' },
      { status: 500 }
    );
  }
}
