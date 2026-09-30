import crypto from 'crypto';

export const OPEE_PUBLIC_KEY_DER_B64 =
  'MCowBQYDK2VwAyEAoCVlzMrnSHU8eoLrSUZoOR5MoW73DZ1f9tttjkWRP4E=';

export const OPEE_MAX_SIGNATURE_AGE_SECONDS = 300;

export interface SignedOpeeRequest {
  timestamp: string;
  signature: string;
  rawBody: string;
  publicKeyDerB64?: string;
  nowEpoch?: number;
  maxAgeSeconds?: number;
}

export function verifySignedOpeeRequest(input: SignedOpeeRequest): boolean {
  const {
    timestamp,
    signature,
    rawBody,
    publicKeyDerB64 = OPEE_PUBLIC_KEY_DER_B64,
    nowEpoch = Math.floor(Date.now() / 1000),
    maxAgeSeconds = OPEE_MAX_SIGNATURE_AGE_SECONDS,
  } = input;

  if (!/^\d{10}$/.test(timestamp) || !signature) return false;
  const requestEpoch = Number(timestamp);
  if (Math.abs(nowEpoch - requestEpoch) > maxAgeSeconds) return false;

  try {
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(publicKeyDerB64, 'base64'),
      format: 'der',
      type: 'spki',
    });
    const signed = Buffer.from(`${timestamp}.${rawBody}`, 'utf8');
    const sig = Buffer.from(signature, 'base64');
    return sig.length === 64 && crypto.verify(null, signed, publicKey, sig);
  } catch {
    return false;
  }
}
