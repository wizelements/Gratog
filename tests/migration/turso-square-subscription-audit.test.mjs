import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { classifySubscription } from '../../scripts/audit-square-sandbox-webhook-subscriptions.mjs';

test('Square Sandbox subscription cannot target production checkout', () => {
  const subscription = classifySubscription({
    enabled: true, notification_url: 'https://tasteofgratitude.shop/api/webhooks/square',
    event_types: ['payment.updated', 'refund.created', 'catalog.version.updated'],
  });
  assert.equal(subscription.productionDestination, true);
  assert.equal(subscription.unsafeDestination, true);
  assert.deepEqual(subscription.events, ['payment.updated', 'refund.created']);
});

test('production hostname impersonation is not confused with real production', () => {
  const subscription = classifySubscription({
    enabled: true, notification_url: 'https://tasteofgratitude.shop.evil.test/api/webhooks/square',
    event_types: ['refund.created'],
  });
  assert.equal(subscription.productionDestination, false);
  assert.equal(subscription.unsafeDestination, false);
});

test('valid dedicated HTTPS staging subscription can be audited read-only', () => {
  const subscription = classifySubscription({
    enabled: true,
    notification_url: 'https://sandbox.example.org/api/webhooks/square',
    event_types: ['payment.created', 'refund.updated'],
  });
  assert.equal(subscription.https, true);
  assert.equal(subscription.unsafeDestination, false);
  assert.equal(subscription.enabled, true);
});

test('non-HTTPS and malformed endpoints are unsafe', () => {
  for (const url of ['http://sandbox.example.org', 'not a url', 'javascript:alert(1)', '']) {
    assert.equal(classifySubscription({notification_url:url}).unsafeDestination,true,url);
  }
});

test('only the exact certified preview URL matches a subscription', () => {
  const expected = 'https://gratog-git-feat-turso-checkout-2101c9-theangelsilvers-projects.vercel.app/api/webhooks/square';
  const wrong = classifySubscription({
    enabled:true, event_types:['refund.created'],
    notification_url:'https://gratog-git-fix-vorax-recovery-i-697931-theangelsilvers-projects.vercel.app/api/webhooks/square',
  }, expected);
  assert.equal(wrong.matchesCertificationPreview, false);
  const correct = classifySubscription({
    enabled:true,event_types:['refund.created'],notification_url:expected,
  }, expected);
  assert.equal(correct.matchesCertificationPreview,true);
});
