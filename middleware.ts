import { NextRequest, NextResponse } from 'next/server';

// Public admin routes (everything else is protected by default)
const PUBLIC_ADMIN_ROUTES = [
  '/admin/login',
];

// Public routes that don't need auth
const PUBLIC_ROUTES = [
  '/admin/login',
  '/api/auth',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // All admin routes are protected unless explicitly public
  const isPublic = PUBLIC_ADMIN_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  // Non-admin routes pass through
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  if (isPublic) {
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
