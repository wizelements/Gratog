import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-session';

function addSecurityHeaders(response: NextResponse): NextResponse {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.squareup.com https://*.squareupsandbox.com https://*.squarecdn.com https://web.squarecdn.com https://vercel.live https://*.vercel.app https://www.googletagmanager.com https://www.google-analytics.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.squarecdn.com https://*.squareup.com https://*.googleusercontent.com https://www.google-analytics.com https://*.amazonaws.com https://items-images-production.s3.us-west-2.amazonaws.com",
    "connect-src 'self' https://*.squareup.com https://*.squareupsandbox.com https://*.squarecdn.com https://www.google-analytics.com https://vercel.live wss://vercel.live https://pci-connect.squareup.com",
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

// Routes that don't require admin auth (within admin paths)
const ADMIN_PUBLIC_ROUTES = [
  '/admin/login',
  '/api/admin/auth/login',
  '/api/admin/auth/logout',
  '/api/admin/setup', // Protected by secret, not token
  '/api/admin/init',  // Protected by secret, not token
  '/api/admin/emergency-init', // Protected by secret, not token
];

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;
  
  // Pass pathname to layout for conditional rendering
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', pathname);

  // CRITICAL FIX 1: Enforce HTTPS and correct canonical domain
  const host = req.headers.get('host') || '';
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
  const isProd = !isLocalhost && !host.includes('preview') && !host.includes('vercel');
  
  if (!isLocalhost && isProd) {
    // Force HTTPS
    if (req.nextUrl.protocol === 'http:') {
      url.protocol = 'https:';
      return NextResponse.redirect(url, 301);
    }
    
    // Redirect non-canonical domains to primary domain
    if (!host.includes('tasteofgratitude.shop')) {
      const canonicalUrl = new URL(pathname + url.search, 'https://tasteofgratitude.shop');
      return NextResponse.redirect(canonicalUrl, 301);
    }
  }

  // Redirect old /delivery route to /order with tab param
  if (pathname === '/delivery') {
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
      httpOnly: true,
      maxAge: 60
    });
    return addSecurityHeaders(res);
  }

  // Check if this is an admin route (page or API)
  const isAdminPage = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');
  
  // Check if route is in the public list
  const isPublicAdminRoute = ADMIN_PUBLIC_ROUTES.some(route => pathname === route);

  // Protect admin pages (except public routes like login)
  if (isAdminPage && !isPublicAdminRoute) {
    const token = req.cookies.get('admin_token')?.value;
    const decoded = token ? await verifyAdminToken(token) : null;
    
    if (!decoded) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      return addSecurityHeaders(redirectResponse);
    }
  }

  // Protect admin API routes (except public routes)
  // This is a defense-in-depth measure - individual routes should also validate
  if (isAdminApi && !isPublicAdminRoute) {
    const token = req.cookies.get('admin_token')?.value;
    const decoded = token ? await verifyAdminToken(token) : null;
    
    if (!decoded) {
      return addSecurityHeaders(
        NextResponse.json(
          { success: false, error: 'Unauthorized - Admin access required' },
          { status: 401 }
        )
      );
    }
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
