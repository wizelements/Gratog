import { createHmac, timingSafeEqual } from 'node:crypto';

/** Square signatures bind the *configured notification URL* and unmodified
 * raw request bytes. Never sign decoded JSON or an arbitrary Host header. */
export function verifySquareWebhookHmac(
  signature: string | null | undefined,
  notificationUrl: string,
  rawBody: string,
  signatureKey: string
): boolean {
  if (!signature || !signatureKey || !notificationUrl ||
      !notificationUrl.startsWith('https://')) return false;
  const expected = Buffer.from(
    createHmac('sha256', signatureKey).update(notificationUrl + rawBody).digest('base64'),
    'utf8'
  );
  const received = Buffer.from(signature.trim(), 'utf8');
  return expected.length === received.length && timingSafeEqual(expected, received);
}
