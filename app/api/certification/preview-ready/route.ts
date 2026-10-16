export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { assertPreviewDatabaseIsolation } from '@/lib/preview-db-isolation';
import { connectToDatabase } from '@/lib/db-optimized';

// Read-only certification gate. Never publishes credentials or database names.
// Production never exposes this endpoint.
export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview') {
    return NextResponse.json({ ready: false }, { status: 404 });
  }

  try {
    const isolatedDatabase = assertPreviewDatabaseIsolation();
    const squareSandbox =
      process.env.SQUARE_ENVIRONMENT === 'sandbox' &&
      String(process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || '').startsWith('sandbox-') &&
      Boolean(process.env.SQUARE_ACCESS_TOKEN) &&
      Boolean(process.env.SQUARE_LOCATION_ID) &&
      process.env.SQUARE_MOCK_MODE !== 'true';

    if (!isolatedDatabase || !squareSandbox) {
      return NextResponse.json({ ready: false }, { status: 503 });
    }

    const { db } = await connectToDatabase();
    if (db.databaseName !== isolatedDatabase) {
      return NextResponse.json({ ready: false }, { status: 503 });
    }

    await db.command({ ping: 1 }); // read-only; does not create any customer data
    return NextResponse.json({
      ready: true,
      isolatedDatabase: true,
      squareSandbox: true,
      databaseConnected: true,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ready: false }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
