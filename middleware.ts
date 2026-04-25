import { NextRequest, NextResponse } from 'next/server';

// Protected admin routes
const PROTECTED_ROUTES = [
  '/admin/market-day',
  '/admin/market-setup',
  '/admin/analytics',
  '/admin/qr-generator',
];

// Public routes that don't need auth
const PUBLIC_ROUTES = [
  '/admin/login',
  '/api/auth',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this is a protected route
  const isProtected = PROTECTED_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Check for auth token in cookie or header
  const token = request.cookies.get('admin_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  const apiKey = process.env.ADMIN_API_KEY;
  const masterKey = process.env.MASTER_API_KEY;

  if (!token || (token !== apiKey && token !== masterKey)) {
    // Redirect to login
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
