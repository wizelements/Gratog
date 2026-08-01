/**
 * Cron route authentication.
 *
 * OPEE ADMIN-04: Machine-to-machine cron routes use a dedicated CRON_SECRET,
 * validated with constant-time comparison. This is separate from interactive
 * admin JWT auth and must never be used for admin sessions.
 *
 * Rules:
 *   - Cron secrets are for server-to-server operations only.
 *   - Never accept a cron secret as an admin session.
 *   - Never allow an admin JWT to substitute for a cron secret.
 *   - Always use constant-time comparison to prevent timing attacks.
 *   - Default-deny: if CRON_SECRET is not set, all cron requests are rejected.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Constant-time string comparison to prevent timing attacks.
 * Returns true if both strings are the same length and every byte matches.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to avoid leaking length via timing
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Require a valid CRON_SECRET for machine-to-machine cron routes.
 *
 * Accepts the secret via:
 *   1. Authorization: Bearer <CRON_SECRET> header
 *   2. X-Cron-Secret: <CRON_SECRET> header
 *   3. Request body `secret` field (for POST routes)
 *
 * Returns null if authenticated, or a NextResponse(401) if not.
 */
export function requireCronSecret(
  request: NextRequest,
  body?: Record<string, unknown>
): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;

  // Default-deny: if no CRON_SECRET is configured, reject all cron requests
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'Cron authentication not configured' },
      { status: 503 }
    );
  }

  // Check Authorization: Bearer header
  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (bearer && timingSafeEqual(bearer, cronSecret)) {
    return null; // Authenticated
  }

  // Check X-Cron-Secret header
  const cronHeader = request.headers.get('x-cron-secret') || '';
  if (cronHeader && timingSafeEqual(cronHeader, cronSecret)) {
    return null; // Authenticated
  }

  // Check body secret field (for POST routes)
  if (body && typeof body.secret === 'string' && timingSafeEqual(body.secret, cronSecret)) {
    return null; // Authenticated
  }

  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}