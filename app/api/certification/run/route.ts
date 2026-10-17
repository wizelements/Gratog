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

async function squareApi(path: string, method: 'GET' | 'POST' | 'PUT', data?: unknown) {
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
  let payload: any;
  try { payload = await request.json(); action = payload.action; }
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


    if (action === 'refund_status') {
      phase = 'square_refund_status';
      const refundId = payload?.refundId;
      if (typeof refundId !== 'string' || !/^[A-Za-z0-9_-]{10,140}$/.test(refundId)) {
        return NextResponse.json({ error: 'Valid refundId required' }, { status: 400 });
      }
      const current = await squareApi('/v2/refunds/' + encodeURIComponent(refundId), 'GET');
      return NextResponse.json({
        pass: current?.refund?.status === 'COMPLETED',
        sandboxOnly: true, refundStatus: current?.refund?.status,
        refundId,
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'square_webhook_subscriptions' || action === 'square_webhook_test') {
      phase = 'square_webhook_subscriptions';
      const current = await squareApi('/v2/webhooks/subscriptions?include_disabled=true', 'GET');
      const listed = Array.isArray(current?.subscriptions) ? current.subscriptions : [];
      const records = await Promise.all(listed.map(async (item: any) => {
        if (!item?.id || typeof item.id !== 'string') return item;
        try {
          const detail = await squareApi('/v2/webhooks/subscriptions/' + encodeURIComponent(item.id), 'GET');
          return { ...item, ...(detail?.subscription || {}) };
        } catch { return item; }
      }));
      const currentHost = String(process.env.VERCEL_URL || '').toLowerCase();
      const safeRecords = records.map((s: any) => {
        let host = '';
        let path = '';
        let bypassParameterPresent = false;
        try {
          const url = new URL(String(s.notification_url || ''));
          host = url.hostname.toLowerCase();
          path = url.pathname;
          bypassParameterPresent = url.searchParams.has('x-vercel-protection-bypass');
        } catch { /* never return a raw notification URL */ }
        const configuredKey = process.env.SQUARE_PAYMENT_WEBHOOK_SIGNATURE_KEY ||
          process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
        return {
          enabled: s.enabled === true,
          host, path, bypassParameterPresent,
          eventTypes: Array.isArray(s.event_types) ? s.event_types.filter((v: any) =>
            ['payment.created', 'payment.updated', 'refund.created', 'refund.updated'].includes(v)) : [],
          signingKeyMatches: typeof s.signature_key === 'string' && configuredKey
            ? s.signature_key === configuredKey : null,
          currentDeploymentHost: host === currentHost,
        };
      });
      if (action === 'square_webhook_subscriptions') {
        return NextResponse.json({
          pass: true, sandboxOnly: true,
          subscriptionCount: records.length,
          currentPreviewRegistered: safeRecords.some((s) => s.currentDeploymentHost),
          activeSubscriptions: safeRecords.filter((s) => s.enabled).length,
          disabledSubscriptions: safeRecords.filter((s) => !s.enabled).length,
          subscriptions: safeRecords,
          automationBypassAvailable: Boolean(process.env.VERCEL_AUTOMATION_BYPASS_SECRET),
        }, { headers: { 'Cache-Control': 'no-store' } });
      }

      phase = 'square_webhook_provider_delivery';
      const chosen = records.find((s: any) => {
        try {
          const u = new URL(String(s.notification_url || ''));
          return s.enabled === true && u.protocol === 'https:' &&
            u.hostname.endsWith('.vercel.app') &&
            ['/api/webhooks/square/payment', '/api/webhooks/square'].includes(u.pathname) &&
            Array.isArray(s.event_types) && s.event_types.includes('payment.created');
        } catch { return false; }
      });
      if (!chosen || typeof chosen.id !== 'string') {
        return NextResponse.json({
          pass: false, sandboxOnly: true, phase,
          reason: 'No enabled expected Preview payment webhook subscription',
        }, { status: 503 });
      }
      const test = await squareApi(
        '/v2/webhooks/subscriptions/' + encodeURIComponent(chosen.id) + '/test',
        'POST', { event_type: 'payment.created' },
      );
      const statusCode = test?.subscription_test_result?.status_code ?? test?.status_code;
      const pass = Number.isInteger(statusCode) && statusCode >= 200 && statusCode < 300;
      return NextResponse.json({
        pass, sandboxOnly: true, providerTestDispatched: true,
        providerDeliveryStatus: statusCode ?? null,
        providerResponseFields: Object.keys(test || {}),
        providerResultFields: Object.keys(test?.subscription_test_result || {}),
        notificationHost: safeRecords.find((s) => s.host &&
          String(chosen.notification_url).includes(s.host))?.host || null,
      }, { status: pass ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'square_webhook_repair') {
      phase = 'sandbox_preview_webhook_access';
      const branchHost = 'gratog-git-fix-vorax-recovery-i-697931-theangelsilvers-projects.vercel.app';
      const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '';
      if (bypassSecret.length < 24 || !/^[a-zA-Z0-9]+$/.test(bypassSecret)) {
        return NextResponse.json({ pass: false, reason: 'Automation bypass not configured' }, { status: 503 });
      }
      const target = new URL('https://' + branchHost + '/api/webhooks/square');
      target.searchParams.set('x-vercel-protection-bypass', bypassSecret);
      // Verify the secret really reaches this branch's application before changing Square.
      const probe = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-square-hmacsha256-signature': 'invalid' },
        body: '{}', cache: 'no-store', signal: AbortSignal.timeout(9000),
      });
      const probeBody = await probe.json().catch(() => ({}));
      const applicationReached = probe.status === 401 && probeBody?.error === 'Invalid signature';
      if (!applicationReached) {
        return NextResponse.json({
          pass: false, applicationReached: false, probeStatus: probe.status,
        }, { status: 503 });
      }
      phase = 'sandbox_subscription_update';
      const current = await squareApi('/v2/webhooks/subscriptions?include_disabled=true', 'GET');
      const subscriptions = Array.isArray(current?.subscriptions) ? current.subscriptions : [];
      const approvedHosts = new Set([
        'gratog-cyky35473-theangelsilvers-projects.vercel.app', branchHost,
      ]);
      const candidates = subscriptions.filter((item: any) => {
        try {
          const u = new URL(String(item.notification_url || ''));
          return item.enabled === true && u.protocol === 'https:' &&
            approvedHosts.has(u.hostname.toLowerCase()) &&
            ['/api/webhooks/square/payment', '/api/webhooks/square'].includes(u.pathname) &&
            Array.isArray(item.event_types) &&
            item.event_types.includes('payment.created') &&
            item.event_types.includes('payment.updated') &&
            typeof item.id === 'string';
        } catch { return false; }
      });
      if (candidates.length !== 1) {
        return NextResponse.json({ pass: false, reason: 'Expected exactly one approved active Sandbox payment subscription', matchingCount: candidates.length }, { status: 503 });
      }
      const record = candidates[0];
      if (record.notification_url !== target.toString() || !['refund.created', 'refund.updated'].every((name) => record.event_types?.includes(name))) {
        const changed = await squareApi('/v2/webhooks/subscriptions/' + encodeURIComponent(record.id), 'PUT', {
          subscription: { notification_url: target.toString(), event_types: ['payment.created', 'payment.updated', 'refund.created', 'refund.updated'] },
        });
        if (changed?.subscription?.notification_url !== target.toString()) {
          return NextResponse.json({ pass: false, reason: 'Square did not confirm callback update' }, { status: 503 });
        }
      }
      return NextResponse.json({
        pass: true, sandboxOnly: true, applicationReached, stableBranchHost: branchHost,
        callbackProtectedByAutomationBypass: true,
        subscriptionConfigured: true,
        signingKeyVerificationRequired: true,
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'webhook_signature') {
      phase = 'square_webhook_signature';
      const signatureKey = process.env.SQUARE_PAYMENT_WEBHOOK_SIGNATURE_KEY || process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
      if (!signatureKey) throw new Error('Sandbox webhook key not configured');
      const url = process.env.SQUARE_PAYMENT_WEBHOOK_URL ||
        'https://' + process.env.VERCEL_URL + '/api/webhooks/square/payment';
      const body = JSON.stringify({
        merchant_id: 'certification-sandbox', event_id: 'cert-' + randomUUID(),
        type: 'payment.updated', data: { object: { payment: { id: 'cert-' + randomUUID() } } },
      });
      const signature = (await import('node:crypto')).createHmac('sha256', signatureKey).update(url + body).digest('base64');
      const webhook = await import('@/app/api/webhooks/square/payment/route');
      const badResponse = await webhook.POST(new NextRequest(url, {
        method: 'POST', headers: { 'x-square-hmacsha256-signature': 'invalid' }, body,
      }));
      const validResponse = await webhook.POST(new NextRequest(url, {
        method: 'POST', headers: { 'x-square-hmacsha256-signature': signature }, body,
      }));
      const pass = badResponse.status === 401 && validResponse.status === 200;
      return NextResponse.json({
        pass, invalidSignatureStatus: badResponse.status, validSignatureStatus: validResponse.status,
        syntheticEventIgnored: (await validResponse.json()).ignored === true,
        providerDeliveryProven: false,
      }, { status: pass ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'resend_provider') {
      phase = 'resend_provider';
      if (!process.env.RESEND_API_KEY) throw new Error('Resend Preview credential not configured');
      const from = process.env.RESEND_FROM_EMAIL || 'Taste of Gratitude <hello@tasteofgratitude.shop>';
      const roles = ['customer', 'staff'];
      const results: Array<{ role: string; accepted: boolean; httpStatus: number }> = [];
      for (const role of roles) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: {
            Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from, to: ['delivered@resend.dev'],
            subject: 'Taste of Gratitude sandbox certification - ' + role,
            html: '<p>Automated Preview notification transport test. No real customer order exists.</p>',
          }),
          cache: 'no-store', signal: AbortSignal.timeout(12000),
        });
        results.push({ role, accepted: response.ok, httpStatus: response.status });
      }
      const pass = results.every(r => r.accepted);
      return NextResponse.json({
        pass, testRecipientOnly: true, actualCustomerOrStaffDeliveryProven: false, results,
      }, { status: pass ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'first_party_checkout') {
      // Disposable customer-journey certification against the already-proven
      // isolated Preview database. No Production database, card, or customer.
      // This action creates a real first-party Mongo order and makes an actual
      // Square Sandbox charge which is immediately submitted for refund.
      phase = 'first_party_checkout_fixture';
      const productId = 'cert-checkout-' + randomUUID();
      const variationId = 'cert-variation-' + randomUUID();
      const attemptKey = 'cert-attempt-' + randomUUID();
      const sandboxEmail = 'delivered@resend.dev';
      const certificationSource = 'qa_isolated_preview_only';
      const productCollection = db.collection('unified_products');
      const inventoryCollection = db.collection('inventory');
      let orderId: string | null = null;
      let paymentId: string | null = null;
      let refundId: string | null = null;
      let refundStatus: string | null = null;
      let paymentAttempted = false;
      const evidence: Record<string, unknown> = {
        isolatedDatabase: true, sandboxOnly: true, testRecipientOnly: true,
        productionMutation: false,
      };
      let failurePhase: string | null = null;
      let errorType: string | null = null;
      try {
        await productCollection.insertOne({
          id: productId, source: certificationSource,
          name: 'TEST ONLY — Taste of Gratitude Strawberry Bliss 16oz',
          category: 'Lemonades', price: 11.99, priceCents: 1199,
          squareEcomAvailable: true, inStock: true, currentStock: 1,
          variations: [{ id: variationId, name: '16oz', price: 11.99, priceCents: 1199 }],
        });
        await inventoryCollection.insertOne({
          productId, currentStock: 1, source: certificationSource,
        });

        phase = 'first_party_order_create';
        const { POST: createFirstPartyOrder } =
          await import('@/app/api/orders/create/route');
        const payload = {
          customer: { name: 'QA Sandbox Certification', email: sandboxEmail },
          cart: [{ productId, variationId, quantity: 1, price: 0.01 }],
          fulfillmentType: 'pickup',
          pickup: { locationId: 'certification-only-pickup' },
          source: certificationSource, subtotal: 0.01, total: 0.01,
        };
        const makeOrderRequest = () => new NextRequest(
          'https://preview-certification.invalid/api/orders/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Idempotency-Key': attemptKey },
            body: JSON.stringify(payload),
          });
        const createResponse = await createFirstPartyOrder(makeOrderRequest());
        const created = await createResponse.json();
        if (createResponse.status !== 200 || created?.success !== true ||
            typeof created?.order?.id !== 'string') {
          throw new Error('FirstPartyOrderCreateFailed');
        }
        orderId = created.order.id;
        evidence.orderCreated = true;
        evidence.serverOwnedPrice = created.order.pricing?.total === 11.99;
        evidence.sandboxCustomerOnly = payload.customer.email === sandboxEmail;
        if (!evidence.serverOwnedPrice || !created.order.orderAccessToken) {
          throw new Error('ServerPricingOrOrderTokenFailed');
        }

        phase = 'first_party_order_idempotency';
        const replayResponse = await createFirstPartyOrder(makeOrderRequest());
        const replay = await replayResponse.json();
        const count = await db.collection('orders').countDocuments({ id: orderId });
        evidence.sameOrderOnReplay = replayResponse.status === 200 &&
          replay?.order?.id === orderId && count === 1;
        if (!evidence.sameOrderOnReplay) throw new Error('OrderReplayFailed');

        phase = 'first_party_sandbox_payment';
        const { POST: processFirstPartyPayment } =
          await import('@/app/api/payments/route');
        paymentAttempted = true;
        const paymentResponse = await processFirstPartyPayment(new NextRequest(
          'https://preview-certification.invalid/api/payments', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourceId: 'cnon:card-nonce-ok', amountCents: 1199, currency: 'USD',
              orderId, orderAccessToken: created.order.orderAccessToken,
              customer: payload.customer, idempotencyKey: 'cert-pay-' + randomUUID(),
            }),
          }));
        const paymentResult = await paymentResponse.json();
        evidence.firstPartyPaymentHttpStatus = paymentResponse.status;
        evidence.firstPartyPaymentCode = typeof paymentResult?.code === 'string'
          ? paymentResult.code : null;
        paymentId = typeof paymentResult?.payment?.id === 'string'
          ? paymentResult.payment.id : null;
        // Lookup persisted Square ID even if the HTTP request failed after capture.
        const storedAfterPayment = await db.collection('orders').findOne({ id: orderId });
        if (!paymentId && typeof storedAfterPayment?.squarePaymentId === 'string') {
          paymentId = storedAfterPayment.squarePaymentId;
        }
        evidence.paymentCaptured = paymentResponse.status === 200 &&
          paymentResult?.success === true &&
          paymentResult?.payment?.status === 'COMPLETED' && Boolean(paymentId);
        evidence.paidOrderPersisted = Boolean(storedAfterPayment?.paidAt) ||
          ['paid', 'CONFIRMED', 'payment_completed', 'SHIPPING_CONFIRMED'].includes(
            String(storedAfterPayment?.status || ''));
        evidence.customerEmailClaimRecorded = Boolean(storedAfterPayment?.emailSentAt);
        evidence.staffNotificationClaimRecorded = Boolean(storedAfterPayment?.staffNotifiedAt);
        evidence.customerDeliveryProven = false;
        evidence.staffDeliveryProven = false;
        const remaining = (await inventoryCollection.findOne({ productId }))?.currentStock;
        evidence.inventoryAfterCapture = remaining;
        evidence.singleUnitConsumed = remaining === 0;
        if (!evidence.paymentCaptured || !evidence.paidOrderPersisted ||
            !evidence.singleUnitConsumed) {
          throw new Error('FirstPartyPaymentOrInventoryFailure');
        }
      } catch (err) {
        failurePhase = phase;
        errorType = err instanceof Error ? err.name : 'UnknownError';
        evidence.failure = err instanceof Error && /^FirstParty|^ServerPricing|^OrderReplay/.test(err.message)
          ? err.message : 'Provider or first-party transition failed';
      } finally {
        // Never leave a Sandbox capture without refund attempt, even when
        // later notification and inventory assertions fail.
        if (paymentId) {
          phase = 'first_party_sandbox_refund';
          try {
            const refund = await squareApi('/v2/refunds', 'POST', {
              idempotency_key: 'cert-refund-' + randomUUID(),
              payment_id: paymentId,
              amount_money: { amount: 1199, currency: 'USD' },
              reason: 'Taste of Gratitude isolated first-party checkout QA refund',
            });
            refundId = typeof refund?.refund?.id === 'string' ? refund.refund.id : null;
            refundStatus = typeof refund?.refund?.status === 'string'
              ? refund.refund.status : null;
          } catch {
            evidence.refundError = true;
          }
        }
        evidence.refundSubmitted = paymentId ? Boolean(refundId) : null;
        evidence.refundStatus = refundStatus;
        // Retain a paid QA order only in the dedicated disposable certification
        // database for provider reconciliation. Never erase unresolved captures.
        if (!paymentId) {
          if (orderId) await db.collection('orders').deleteOne({
            id: orderId, source: certificationSource,
          }).catch(() => undefined);
          await productCollection.deleteOne({ id: productId, source: certificationSource })
            .catch(() => undefined);
          await inventoryCollection.deleteOne({ productId, source: certificationSource })
            .catch(() => undefined);
        }
      }
      const pass = !failurePhase && evidence.paymentCaptured === true &&
        evidence.sameOrderOnReplay === true && evidence.singleUnitConsumed === true &&
        evidence.refundSubmitted === true;
      return NextResponse.json({
        pass, paymentAttempted, failurePhase, errorType,
        ...evidence, sandboxPaymentId: paymentId, sandboxRefundId: refundId,
      }, { status: pass ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'first_party_refund_audit') {
      phase = 'first_party_refund_audit';
      const paymentId = payload?.paymentId;
      if (typeof paymentId !== 'string' || !/^[A-Za-z0-9_-]{10,140}$/.test(paymentId)) {
        return NextResponse.json({ pass: false, error: 'Valid Sandbox paymentId required' }, { status: 400 });
      }
      const order = await db.collection('orders').findOne({
        squarePaymentId: paymentId, source: 'qa_isolated_preview_only',
      });
      if (!order) return NextResponse.json({ pass: false, orderFound: false }, { status: 404 });
      const status = String(order.paymentStatus || '');
      const captured = String(order.status || '');
      const refunded = ['REFUNDED', 'refunded'].includes(status) ||
        ['REFUNDED', 'refunded'].includes(captured);
      return NextResponse.json({
        pass: refunded, orderFound: true, sandboxOnly: true, isolatedDatabase: true,
        paymentStatus: status, orderStatus: captured,
        refundLedgerCents: Number(order.refundAmountCents || order.refundAmount || 0),
        customerEmailClaimRecorded: Boolean(order.emailSentAt),
        staffNotificationClaimRecorded: Boolean(order.staffNotifiedAt),
      }, { status: refunded ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'mongo_race') {
      phase = 'mongo_concurrency';
      const { reserveCheckoutInventory, releaseCheckoutInventory } =
        await import('@/lib/checkout/stock-reservation');
      const productId = 'cert-stock-' + randomUUID();
      const orders = Array.from({ length: 24 }, (_, i) => 'cert-order-' + i + '-' + randomUUID());
      const inventory = db.collection('inventory');
      await inventory.insertOne({ productId, currentStock: 1 });
      const results = await Promise.allSettled(orders.map(orderId =>
        reserveCheckoutInventory(db, client, { orderId, items: [{ productId, quantity: 1 }] }),
      ));
      const winners = results.map((r, i) => r.status === 'fulfilled' && r.value?.valid ? orders[i] : null).filter(Boolean) as string[];
      const rejected = results.filter(r => r.status === 'fulfilled' && !r.value?.valid).length;
      const errors = results.filter(r => r.status === 'rejected').length;
      const remaining = (await inventory.findOne({ productId }))?.currentStock;
      for (const winner of winners) await releaseCheckoutInventory(db, client, winner, 'certification_cleanup');
      const restored = (await inventory.findOne({ productId }))?.currentStock;
      await inventory.deleteOne({ productId });
      await db.collection('checkout_stock_claims').deleteMany({ orderId: { $in: orders } });
      await db.collection('inventory_events').deleteMany({ orderId: { $in: orders } });
      const pass = winners.length === 1 && rejected === 23 && errors === 0 && remaining === 0 && restored === 1;
      return NextResponse.json({
        pass, contenders: orders.length, admitted: winners.length, rejected, errors,
        stockAfterClaims: remaining, stockAfterCleanup: restored, isolatedDatabase: true,
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
