import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function addSecurityHeaders(response: NextResponse): NextResponse {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.squareup.com https://*.squareupsandbox.com https://vercel.live https://*.vercel.app https://www.googletagmanager.com https://www.google-analytics.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.squarecdn.com https://*.googleusercontent.com https://www.google-analytics.com",
    "connect-src 'self' https://*.squareup.com https://*.squareupsandbox.com https://www.google-analytics.com https://vercel.live wss://vercel.live",
    "frame-src 'self' https://*.squareup.com https://*.squareupsandbox.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export function middleware(req: NextRequest) {
  const url = new URL(req.url);

  // Redirect old /delivery route to /order with tab param
  if (url.pathname === '/delivery') {
    url.pathname = '/order';
    url.searchParams.set('tab', 'delivery');
    const redirectResponse = NextResponse.redirect(url, 301);
    return addSecurityHeaders(redirectResponse);
  }

  // Handle delivery disabled notice
  if (url.searchParams.get('notice') === 'delivery_off') {
    const res = NextResponse.next();
    res.cookies.set('notice', 'delivery_off', { 
      path: '/', 
      httpOnly: false,
      maxAge: 60 // 1 minute
    });
    return addSecurityHeaders(res);
  }

  // Protect admin pages (except login)
  if (url.pathname.startsWith('/admin') && url.pathname !== '/admin/login') {
    const token = req.cookies.get('admin_token')?.value;
    
    if (!token) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('redirect', url.pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      return addSecurityHeaders(redirectResponse);
    }
  }

  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

export const config = {
  matcher: ['/delivery', '/', '/admin/:path*'],
};
