/**
 * Diagnostics / debug / startup route guard.
 *
 * Returns a `NextResponse` with status 404 when the runtime looks like
 * production. Diagnostic endpoints leak Square configuration, MongoDB ping
 * status, environment shape, and token validation results — none of which
 * should be reachable by an anonymous internet visitor.
 *
 * Usage at the top of every diagnostic route handler:
 *
 *   const blocked = blockInProduction(request);
 *   if (blocked) return blocked;
 */
import { NextRequest, NextResponse } from 'next/server';

function isProduction(): boolean {
  // Treat Vercel production target as authoritative; everything else is fair
  // game for diagnostics in preview / dev.
  if (process.env.VERCEL_ENV === 'production') return true;
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production') return true;
  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV) {
    return true;
  }
  return false;
}

export function blockInProduction(_req?: NextRequest): NextResponse | null {
  if (!isProduction()) return null;
  return new NextResponse('Not Found', { status: 404 });
}
