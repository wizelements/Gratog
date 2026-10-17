import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Square signs the exact public notification URL followed by the unmodified
 * request body. Fail closed when any required input is missing.
 */
export function verifySquareWebhookSignature(
  signatureHeader: string | null,
  rawBody: string,
  notificationUrl: string,
  signatureKey: string | undefined
): boolean {
  if (!signatureKey || !notificationUrl || !signatureHeader) return false;
  try {
    const expected = createHmac('sha256', signatureKey)
      .update(notificationUrl + rawBody, 'utf8')
      .digest();
    const received = Buffer.from(signatureHeader.trim(), 'base64');
    return received.length === expected.length && timingSafeEqual(received, expected);
  } catch {
    return false;
  }
}
