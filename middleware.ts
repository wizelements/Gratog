import { NextRequest, NextResponse } from 'next/server';
// IMPORTANT: this file runs on the Edge Runtime.
// `lib/admin-session` only depends on `jose` (Edge-safe). Do NOT import
// `lib/auth/unified-admin` here — it transitively imports the MongoDB layer
// (lib/db-optimized → mongoose), which the Edge bundler rejects with
// "Dynamic Code Evaluation not allowed in Edge Runtime". Both modules sign
// with the same JWT_SECRET / HS256, so verifying tokens with admin-session
// is fully interoperable with tokens issued by unified-admin.
import { verifyAdminToken } from '@/lib/admin-session';

// Routes that the admin area exposes without authentication.
const PUBLIC_ADMIN_ROUTES = ['/admin/login'];

// API routes under /api/admin that the admin login flow itself must reach
// before any session exists.
const PUBLIC_ADMIN_API_ROUTES = [
  '/api/admin/auth/login',
  '/api/admin/auth/logout',
  '/api/admin/auth/reset-password',
];

const ADMIN_COOKIE_NAME = 'admin_token';

function isPublicAdminPath(pathname: string): boolean {
  if (
    PUBLIC_ADMIN_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + '/')
    )
  ) {
    return true;
  }
  if (
    PUBLIC_ADMIN_API_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + '/')
    )
  ) {
    return true;
  }
  return false;
}

function unauthorizedApi(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Unauthorized', code: 'ADMIN_AUTH_REQUIRED' },
    { status: 401 }
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through non-admin paths untouched.
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }

  if (isPublicAdminPath(pathname)) {
    return NextResponse.next();
  }

  // Cookie is the canonical source of admin identity.
  // The legacy Authorization: Bearer <API_KEY> path is removed.
  // Admin identity is ALWAYS a signed JWT issued by lib/auth/unified-admin.ts.
  // The Authorization header is accepted ONLY for JWT tokens (not API keys),
  // to support programmatic admin access via Bearer JWT.
  const cookieToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const headerToken = request.headers.get('authorization')?.replace('Bearer ', '');

  // Prefer cookie; fall back to Authorization header only if it looks like a JWT
  // (three dot-separated segments). Raw API keys must never be accepted here.
  let token: string | undefined;
  if (cookieToken) {
    token = cookieToken;
  } else if (headerToken && headerToken.split('.').length === 3) {
    token = headerToken;
  }

  const session = token ? await verifyAdminToken(token) : null;

  if (!session) {
    // API: return 401 JSON; pages: redirect to login with intended path.
    if (pathname.startsWith('/api/admin')) {
      return unauthorizedApi();
    }
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
