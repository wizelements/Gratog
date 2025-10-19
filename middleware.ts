import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';
import crypto from 'crypto';

// Specify Node.js runtime (required for bcryptjs, jsonwebtoken)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/admin/:path*',
    '/api/:path*',
  ],
  runtime: 'nodejs',
};

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const response = NextResponse.next();

  // Generate CSP nonce for inline scripts
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  
  // Content Security Policy - Optimized for Emergent preview
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-eval' 'nonce-${nonce}' 'strict-dynamic' https://web.squarecdn.com https://sandbox.web.squarecdn.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://web.squarecdn.com https://sandbox.web.squarecdn.com https://*.posthog.com",
    "frame-src 'self' https://web.squarecdn.com https://sandbox.web.squarecdn.com",
    // Allow embedding in Emergent app preview (remove frame-ancestors restriction)
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-CSP-Nonce', nonce);

  // Additional security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  // CSRF Protection for state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    
    // Skip CSRF for webhook routes (they have signature verification)
    if (!path.startsWith('/api/square-webhook') && !path.startsWith('/api/cron')) {
      // Verify origin matches host for API requests
      if (path.startsWith('/api/')) {
        const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',');
        const isAllowedOrigin = origin && (
          origin === `https://${host}` ||
          origin === `http://${host}` ||
          allowedOrigins.some(allowed => origin === allowed.trim())
        );

        if (!isAllowedOrigin) {
          // Log CSRF rejection for monitoring
          console.warn('CSRF validation failed:', {
            method: request.method,
            path: path,
            origin: origin,
            host: host,
          });
          
          return NextResponse.json(
            { error: 'CSRF validation failed' },
            { status: 403 }
          );
        }
      }
    }
  }

  // Admin route protection
  if (path.startsWith('/admin') && path !== '/admin/login') {
    const token = request.cookies.get('admin_token')?.value;
    
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      response.cookies.delete('admin_token');
      return response;
    }
  }

  return response;
}
