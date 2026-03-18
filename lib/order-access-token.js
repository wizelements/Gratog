import crypto from 'crypto';

const DEFAULT_ORDER_ACCESS_TTL_MS = 15 * 60 * 1000; // 15 minutes
const LOCAL_DEV_ORDER_ACCESS_SECRET = 'local-dev-order-access-token-secret';

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
    .update(encodedPayload)
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
  if (!orderId) {
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
    const [encodedPayload, signature] = String(token || '').split('.');
    if (!encodedPayload || !signature) {
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
    if (!payload?.o || !payload?.exp || Date.now() > Number(payload.exp)) {
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
