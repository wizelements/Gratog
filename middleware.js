import { NextResponse } from 'next/server';

export function middleware(request) {
  const path = request.nextUrl.pathname;

  // Protect admin routes - simplified check without JWT verification
  // JWT verification moved to API routes since middleware runs on Edge Runtime
  if (path.startsWith('/admin') && path !== '/admin/login') {
    const token = request.cookies.get('admin_token')?.value;
    
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    
    // Token exists, allow through - API routes will verify the JWT
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
