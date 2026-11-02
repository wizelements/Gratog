import crypto from 'crypto';

const DEFAULT_ORDER_ACCESS_TTL_MS = 15 * 60 * 1000; // 15 minutes
const LOCAL_DEV_ORDER_ACCESS_SECRET = 'local-dev-order-access-token-secret';

// Domain separation prevents a shared legacy JWT secret from making Preview
// order links valid in Production or in an unrelated Preview deployment.
function orderAccessAudience() {
  const environment = process.env.VERCEL_ENV ||
    (process.env.NODE_ENV === 'production' ? 'production' : 'development');
  if (!['production', 'preview', 'development'].includes(environment)) return null;
  const project = process.env.VERCEL_PROJECT_ID || 'gratog';
  const preview = environment === 'preview'
    ? ':' + (process.env.VERCEL_URL || process.env.VERCEL_GIT_COMMIT_REF || 'local-preview')
    : '';
  return `gratog-order-access:v2:${environment}:${project}${preview}`;
}

function getOrderAccessSecret() {
  const configuredSecret = (
    process.env.ORDER_ACCESS_TOKEN_SECRET ||
    process.env.JWT_SECRET ||
    process.env.MASTER_API_KEY ||
    ''
  );

  if (configuredSecret) {
    return configuredSecret;
  }

  if (enforceSecret()) {
    return '';
  }

  // Preserve local/dev tokenized flows even when secrets are not configured.
  return LOCAL_DEV_ORDER_ACCESS_SECRET;
}

function enforceSecret() {
  return process.env.NODE_ENV === 'production' || process.env.ORDER_ACCESS_TOKEN_ENFORCED === 'true';
}

function encodePayload(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodePayload(encodedPayload) {
  return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
}

function signPayload(encodedPayload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update('gratog-order-access:v2\0' + orderAccessAudience() + '\0' + encodedPayload)
    .digest('base64url');
}

function safeTimingEqual(a, b) {
  const aBuffer = Buffer.from(String(a || ''));
  const bBuffer = Buffer.from(String(b || ''));
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export function generateOrderAccessToken({
  orderId,
  customerEmail,
  ttlMs = DEFAULT_ORDER_ACCESS_TTL_MS,
} = {}) {
  if (typeof orderId !== 'string' || !orderId || orderId.length > 200 ||
      !Number.isSafeInteger(ttlMs) || ttlMs <= 0 || !orderAccessAudience()) {
    return null;
  }

  const secret = getOrderAccessSecret();
  if (!secret) {
    if (enforceSecret()) {
      throw new Error('ORDER_ACCESS_TOKEN_SECRET (or JWT_SECRET) is required');
    }
    return null;
  }

  const now = Date.now();
  const payload = {
    v: 2,
    aud: orderAccessAudience(),
    o: String(orderId),
    e: customerEmail ? String(customerEmail).trim().toLowerCase() : null,
    iat: now,
    exp: now + Math.max(60 * 1000, ttlMs),
  };

  const encodedPayload = encodePayload(payload);
  const signature = signPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function verifyOrderAccessToken(
  token,
  { expectedOrderId = null, expectedEmail = null } = {}
) {
  try {
    const parts = String(token || '').split('.');
    const [encodedPayload, signature] = parts;
    if (parts.length !== 2 || !encodedPayload || !signature ||
        encodedPayload.length > 2048 || !orderAccessAudience()) {
      return null;
    }

    const secret = getOrderAccessSecret();
    if (!secret) {
      return null;
    }

    const expectedSignature = signPayload(encodedPayload, secret);
    if (!safeTimingEqual(signature, expectedSignature)) {
      return null;
    }

    const payload = decodePayload(encodedPayload);
    if (payload?.v !== 2 || payload?.aud !== orderAccessAudience() ||
        typeof payload.o !== 'string' || !payload.o || payload.o.length > 200 ||
        !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp) ||
        payload.exp <= payload.iat || payload.iat > Date.now() + 30_000 ||
        Date.now() >= payload.exp) {
      return null;
    }

    const tokenOrderId = String(payload.o);
    if (expectedOrderId && tokenOrderId !== String(expectedOrderId)) {
      return null;
    }

    const normalizedExpectedEmail = expectedEmail
      ? String(expectedEmail).trim().toLowerCase()
      : null;
    const normalizedTokenEmail = payload.e ? String(payload.e).trim().toLowerCase() : null;

    if (normalizedExpectedEmail && normalizedTokenEmail !== normalizedExpectedEmail) {
      return null;
    }

    return {
      orderId: tokenOrderId,
      email: normalizedTokenEmail,
      expiresAt: Number(payload.exp),
    };
  } catch {
    return null;
  }
}

export function appendOrderAccessToken(url, token) {
  if (!token) {
    return url;
  }

  try {
    const parsed = new URL(url);
    parsed.searchParams.set('token', token);
    return parsed.toString();
  } catch {
    const separator = String(url).includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(token)}`;
  }
}
