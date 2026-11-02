// Preview certification uses an isolated Sandbox subscription. Its per-subscription
// signing key is distinct from the Production key. Resolve only the exact active
// Square Sandbox callback; never accept an unsigned event or affect Production.
let previewWebhookSigningKeyCache: {
  notificationUrl: string; key: string; expiresAt: number;
} | null = null;

export async function getIsolatedPreviewWebhookKey(notificationUrl: string): Promise<string | null> {
  if (process.env.VERCEL_ENV !== 'preview' ||
      process.env.SQUARE_ENVIRONMENT !== 'sandbox') return null;
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token || !notificationUrl.startsWith('https://')) return null;
  if (previewWebhookSigningKeyCache &&
      previewWebhookSigningKeyCache.notificationUrl === notificationUrl &&
      previewWebhookSigningKeyCache.expiresAt > Date.now()) {
    return previewWebhookSigningKeyCache.key;
  }
  const headers = { Authorization: 'Bearer ' + token, 'Square-Version': '2025-01-23' };
  const base = 'https://connect.squareupsandbox.com/v2/webhooks/subscriptions';
  try {
    const listed = await fetch(base, {
      headers, cache: 'no-store', signal: AbortSignal.timeout(6500),
    });
    if (!listed.ok) return null;
    const result = await listed.json();
    const matches = (Array.isArray(result?.subscriptions) ? result.subscriptions : [])
      .filter((item: any) => item.enabled === true &&
        item.notification_url === notificationUrl &&
        Array.isArray(item.event_types) &&
        item.event_types.some((t: string) => t === 'payment.created' || t === 'payment.updated'));
    if (matches.length !== 1 || typeof matches[0]?.id !== 'string') return null;
    const detail = await fetch(base + '/' + encodeURIComponent(matches[0].id), {
      headers, cache: 'no-store', signal: AbortSignal.timeout(6500),
    });
    if (!detail.ok) return null;
    const verified = await detail.json();
    const key = verified?.subscription?.signature_key;
    if (typeof key !== 'string' || key.length < 12 ||
        verified?.subscription?.notification_url !== notificationUrl) return null;
    previewWebhookSigningKeyCache = {
      notificationUrl, key, expiresAt: Date.now() + 5 * 60 * 1000,
    };
    return key;
  } catch { return null; }
}

