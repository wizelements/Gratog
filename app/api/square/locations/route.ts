import { NextResponse } from 'next/server';

const SQUARE_VERSION = '2025-10-16';

function getBaseUrl(environment: string): string {
  return environment === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

export async function GET() {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json(
      { error: 'SQUARE_ACCESS_TOKEN not configured' },
      { status: 500 }
    );
  }

  const environment = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase();
  const baseUrl = getBaseUrl(environment);

  try {
    const response = await fetch(`${baseUrl}/v2/locations`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Square-Version': SQUARE_VERSION,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      return NextResponse.json(
        { error: `Square API error: ${response.status}`, detail: body },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data.locations || []);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
