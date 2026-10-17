#!/usr/bin/env node
/**
 * Read-only Square Sandbox subscription audit. Never creates, updates,
 * deletes, or verifies webhooks by fabricating a signature.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const host = 'https://connect.squareupsandbox.com';
const protectedBranch = 'refs/heads/feat/turso-checkout-recovery-20261017';
const prodHosts = new Set([
  'tasteofgratitude.shop', 'www.tasteofgratitude.shop',
  'gratog.vercel.app', 'taste-og.vercel.app',
]);
export function classifySubscription(subscription) {
  let u;
  try { u = new URL(subscription.notification_url); } catch { u = null; }
  const hostname = u?.hostname?.toLowerCase() || null;
  const pathname = u?.pathname || null;
  const productionDestination = Boolean(hostname && prodHosts.has(hostname));
  return {
    host: hostname,
    path: pathname,
    https: u?.protocol === 'https:',
    enabled: subscription.enabled === true,
    events: Array.isArray(subscription.event_types) ? subscription.event_types.filter(
      x => typeof x === 'string' && /^(payment|refund|order)\./.test(x)
    ) : [],
    productionDestination,
    unsafeDestination: !u || u.protocol !== 'https:' || productionDestination,
  };
}
async function audit() {
  if (process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch' ||
      process.env.GITHUB_REF !== protectedBranch ||
      process.env.SQUARE_ENVIRONMENT !== 'sandbox' ||
      !process.env.SQUARE_SANDBOX_ACCESS_TOKEN) {
    throw Error('PROTECTED_SANDBOX_AUDIT_ONLY');
  }
  const subscriptions = [];
  let cursor = '';
  const seen = new Set();
  for (let page = 0; page < 20; page++) {
    const url = new URL('/v2/webhooks/subscriptions', host);
    url.searchParams.set('limit', '100');
    if (cursor) url.searchParams.set('cursor', cursor);
    const response = await fetch(url, {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: {
        Authorization: 'Bearer ' + process.env.SQUARE_SANDBOX_ACCESS_TOKEN,
        'Square-Version': '2026-09-16',
      },
    });
    if (!response.ok) throw Error('SQUARE_WEBHOOK_SUBSCRIPTION_READ_FAILED_HTTP_' + response.status);
    const body = await response.json();
    if (!Array.isArray(body.subscriptions || [])) throw Error('INVALID_SQUARE_SUBSCRIPTION_RESPONSE');
    subscriptions.push(...(body.subscriptions || []).map(classifySubscription));
    if (!body.cursor) break;
    if (seen.has(body.cursor) || page === 19) throw Error('SQUARE_SUBSCRIPTION_PAGINATION_INCOMPLETE');
    seen.add(body.cursor);
    cursor = body.cursor;
  }
  const report = {
    kind: 'SQUARE_SANDBOX_SUBSCRIPTION_READ_ONLY_AUDIT',
    commit: process.env.GITHUB_SHA,
    generatedAt: new Date().toISOString(),
    readOnly: true,
    sandbox: true,
    count: subscriptions.length,
    subscriptions,
    unsafeCount: subscriptions.filter(x => x.unsafeDestination).length,
    activePaymentOrRefundSubscriptions: subscriptions.filter(x =>
      x.enabled && x.events.length > 0
    ).length,
    providerSignedWebhookDelivered: false,
    customerFacingTursoCheckoutCertified: false,
  };
  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/square-sandbox-webhook-subscriptions.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({
    subscriptionCount: report.count,
    unsafeDestinationCount: report.unsafeCount,
    activePaymentOrRefundSubscriptionCount: report.activePaymentOrRefundSubscriptions,
    destinations: report.subscriptions,
    signedDeliveryCertified: false,
  }, null, 2));
  if (report.unsafeCount > 0) throw Error('SQUARE_SANDBOX_SUBSCRIPTION_UNSAFE_DESTINATION');
  if (report.activePaymentOrRefundSubscriptions === 0) throw Error('SQUARE_SANDBOX_WEBHOOK_SUBSCRIPTION_MISSING');
}
if (process.argv[1]?.endsWith('/audit-square-sandbox-webhook-subscriptions.mjs')) {
  audit().catch(error => {
    console.error(error instanceof Error ? error.message : 'SQUARE_SANDBOX_AUDIT_FAILED');
    process.exitCode = 1;
  });
}
