import crypto from 'crypto';

const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;

// ISS-053 FIX: Fail closed — no hardcoded fallback secret
function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
}

export function generateSubscriptionAccessToken({ email, subscriptionId, ttlMs = ACCESS_TOKEN_TTL_MS }) {
  const payloadObj = {
    e: String(email || '').toLowerCase(),
    s: subscriptionId ? String(subscriptionId) : null,
    exp: Date.now() + ttlMs,
  };

  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const signature = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifySubscriptionAccessToken(token) {
  try {
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature) return null;

    const expectedSig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return null;

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data?.e || !data?.exp || Date.now() > data.exp) return null;

    return {
      email: String(data.e).toLowerCase(),
      subscriptionId: data.s ? String(data.s) : null,
    };
  } catch {
    return null;
  }
}
