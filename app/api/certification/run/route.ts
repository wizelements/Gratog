export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { assertPreviewDatabaseIsolation } from '@/lib/preview-db-isolation';
import { connectToDatabase } from '@/lib/db-optimized';

// Disposable certification-only API: never deploy as a Production capability.
// Preview is behind Vercel Authentication; explicit test-intent header is
// additionally required. All payment calls are hardwired to Square Sandbox.
const CERT_DB = 'tog_checkout_cert_20261016';
const PRODUCTION_DB = 'taste_of_gratitude';
const SQUARE_SANDBOX = 'https://connect.squareupsandbox.com';

async function squareApi(path: string, method: 'GET' | 'POST', data?: unknown) {
  const response = await fetch(SQUARE_SANDBOX + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + process.env.SQUARE_ACCESS_TOKEN,
      'Square-Version': '2025-01-23',
      'Content-Type': 'application/json',
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    cache: 'no-store',
    signal: AbortSignal.timeout(14000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = body?.errors?.[0]?.code || 'UNSPECIFIED';
    throw new Error('Square Sandbox ' + method + ' ' + path + ' failed HTTP ' + response.status + ' (' + code + ')');
  }
  return body;
}

export async function POST(request: NextRequest) {
  if (
    process.env.VERCEL_ENV !== 'preview' ||
    process.env.DATABASE_NAME !== CERT_DB ||
    process.env.SQUARE_ENVIRONMENT !== 'sandbox' ||
    process.env.SQUARE_MOCK_MODE === 'true'
  ) return NextResponse.json({ error: 'Unavailable' }, { status: 404 });
  if (request.headers.get('x-tog-certification-intent') !== 'isolated-square-sandbox-20261016') {
    return NextResponse.json({ error: 'Explicit certification intent required' }, { status: 403 });
  }
  let action: string;
  try { ({ action } = await request.json()); }
  catch { return NextResponse.json({ error: 'Invalid action' }, { status: 400 }); }

  let phase = 'isolation_guard';
  try {
    const databaseName = assertPreviewDatabaseIsolation();
    if (databaseName !== CERT_DB) throw new Error('Certification database selection refused');
    phase = 'isolated_database';
    const { db, client } = await connectToDatabase();
    if (db.databaseName !== CERT_DB) throw new Error('Connected database is not the certification database');
    await db.command({ ping: 1 });

    if (action === 'database') {
      phase = 'database_marker';
      const id = 'cert-' + randomUUID();
      const cert = db.collection('certification_markers');
      await cert.insertOne({ _id: id, createdAt: new Date(), source: 'preview_only' });
      let previewPresent = false;
      let productionAbsent = false;
      let productionReadError = false;
      try {
        previewPresent = Boolean(await cert.findOne({ _id: id }));
        // Explicitly READ ONLY in Production. No Production writes, updates,
        // inserts, deletes, or collection creation occur in this handler.
        try {
          productionAbsent = !(await client.db(PRODUCTION_DB).collection('certification_markers').findOne({ _id: id }));
        } catch {
          productionReadError = true;
        }
      } finally {
        await cert.deleteOne({ _id: id });
      }
      const cleanupVerified = !(await cert.findOne({ _id: id }));
      const pass = previewPresent && productionAbsent && !productionReadError && cleanupVerified;
      return NextResponse.json({
        pass, previewDatabaseSelected: true, previewMarkerInserted: previewPresent,
        productionMarkerAbsent: productionAbsent, productionReadVerified: !productionReadError,
        previewCleanupVerified: cleanupVerified,
      }, { status: pass ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'square') {
      phase = 'square_configuration';
      if (
        !process.env.SQUARE_ACCESS_TOKEN ||
        !process.env.SQUARE_LOCATION_ID ||
        !String(process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || '').startsWith('sandbox-')
      ) throw new Error('Square Sandbox credentials not configured');
      const locationId = process.env.SQUARE_LOCATION_ID;
      phase = 'square_location';
      const locations = await squareApi('/v2/locations/' + encodeURIComponent(locationId), 'GET');
      if (!locations?.location || locations.location.status !== 'ACTIVE') throw new Error('Sandbox location is not active');

      const paymentKey = randomUUID();
      const refundKey = randomUUID();
      const referenceId = 'tog-cert-' + randomUUID().slice(0, 24);
      const payload = {
        source_id: 'cnon:card-nonce-ok',
        idempotency_key: paymentKey,
        amount_money: { amount: 100, currency: 'USD' },
        location_id: locationId,
        reference_id: referenceId,
        autocomplete: true,
        note: 'Taste of Gratitude isolated sandbox certification - not a real order',
      };

      phase = 'square_payment';
      const first = await squareApi('/v2/payments', 'POST', payload);
      const paymentId = first?.payment?.id;
      if (!paymentId || first?.payment?.status !== 'COMPLETED') throw new Error('Sandbox payment not completed');
      phase = 'square_duplicate_payment';
      const retry = await squareApi('/v2/payments', 'POST', payload);
      const idempotencyPass = retry?.payment?.id === paymentId;
      phase = 'square_refund';
      const refund = await squareApi('/v2/refunds', 'POST', {
        idempotency_key: refundKey,
        payment_id: paymentId,
        amount_money: { amount: 100, currency: 'USD' },
        reason: 'Isolated automated Square Sandbox checkout certification',
      });
      const refundId = refund?.refund?.id;
      if (!refundId) throw new Error('Sandbox refund not created');
      phase = 'square_refund_reconciliation';
      const repeatRefund = await squareApi('/v2/refunds', 'POST', {
        idempotency_key: refundKey,
        payment_id: paymentId,
        amount_money: { amount: 100, currency: 'USD' },
        reason: 'Isolated automated Square Sandbox checkout certification',
      });
      const refundIdempotencyPass = repeatRefund?.refund?.id === refundId;
      const fetched = await squareApi('/v2/refunds/' + encodeURIComponent(refundId), 'GET');
      const refundStatus = fetched?.refund?.status;
      const validRefundState = ['PENDING', 'COMPLETED'].includes(refundStatus);
      const pass = idempotencyPass && refundIdempotencyPass && validRefundState;
      return NextResponse.json({
        pass, sandboxOnly: true, paymentStatus: first.payment.status,
        paymentId, idempotencyPass, refundId, refundStatus, refundIdempotencyPass,
        locationActive: true, amountCents: 100,
      }, { status: pass ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json({ error: 'Unsupported certification action' }, { status: 400 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : '';
    const providerFailure = reason.startsWith('Square Sandbox ')
      ? reason : reason === 'Sandbox payment not completed' ? reason : undefined;
    return NextResponse.json({
      pass: false, phase,
      errorType: error instanceof Error ? error.name : 'UnknownError',
      providerFailure,
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
