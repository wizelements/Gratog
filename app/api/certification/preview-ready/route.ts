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

  let phase = 'database_isolation';
  try {
    const isolatedDatabase = assertPreviewDatabaseIsolation();
    phase = 'square_configuration';
    const squareSandbox =
      process.env.SQUARE_ENVIRONMENT === 'sandbox' &&
      String(process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || '').startsWith('sandbox-') &&
      Boolean(process.env.SQUARE_ACCESS_TOKEN) &&
      Boolean(process.env.SQUARE_LOCATION_ID) &&
      process.env.SQUARE_MOCK_MODE !== 'true';

    if (!isolatedDatabase || !squareSandbox) {
      return NextResponse.json({ ready: false, blockedAt: phase }, { status: 503 });
    }

    phase = 'database_connection';
    const { db } = await connectToDatabase();
    phase = 'database_name';
    if (db.databaseName !== isolatedDatabase) {
      return NextResponse.json({ ready: false }, { status: 503 });
    }

    phase = 'database_ping';
    await db.command({ ping: 1 }); // read-only; does not create any customer data
    return NextResponse.json({
      ready: true,
      isolatedDatabase: true,
      squareSandbox: true,
      databaseConnected: true,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    // A non-sensitive error *class* identifies network/auth/config failures.
    // Never include Mongo URLs, token values, or driver error messages.
    const failureType = error instanceof Error ? error.name : 'UnknownError';
    const code = error && typeof error === 'object' && 'code' in error &&
      typeof error.code === 'number' ? error.code : null;
    // Diagnostic is deliberately boolean-only: no database identifiers or credentials.
    const uri = process.env.MONGODB_URI || '';
    const name = process.env.DATABASE_NAME || '';
    let uriValid = false;
    let uriHasDatabase = false;
    let uriDatabaseMatches = false;
    try {
      const parsed = new URL(uri);
      uriValid = ['mongodb:', 'mongodb+srv:'].includes(parsed.protocol);
      const dbPath = decodeURIComponent(parsed.pathname.replace(/^\\/+/, ''));
      uriHasDatabase = dbPath.length > 0;
      uriDatabaseMatches = !uriHasDatabase || dbPath === name;
    } catch { /* no sensitive detail is returned */ }
    const diagnostics = phase === 'database_isolation' ? {
      previewEnvironment: process.env.VERCEL_ENV === 'preview',
      certDatabaseName: /^tog_checkout_cert_[a-z0-9_]+$/i.test(name),
      uriValid, uriHasDatabase, uriDatabaseMatches,
    } : undefined;
    return NextResponse.json({ ready: false, blockedAt: phase, failureType, failureCode: code, diagnostics }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
