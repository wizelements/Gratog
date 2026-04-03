import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminToken, refreshTokenIfNeeded } from '@/lib/admin-session';

function addSecurityHeaders(response: NextResponse): NextResponse {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://web.squarecdn.com https://js.squareup.com https://www.googletagmanager.com https://www.google-analytics.com https://vercel.live",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://web.squarecdn.com",
    "font-src 'self' https://fonts.gstatic.com https://square-fonts-production-f.squarecdn.com https://d1g145x70srn7h.cloudfront.net",
    "img-src 'self' data: blob: https://items-images-production.s3.us-west-2.amazonaws.com https://images.unsplash.com https://www.google-analytics.com",
    "connect-src 'self' https://pci-connect.squareup.com https://web.squarecdn.com https://js.squareup.com https://www.google-analytics.com https://o160250.ingest.sentry.io https://vercel.live wss://vercel.live",
    "frame-src 'self' https://web.squarecdn.com https://js.squareup.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://*.squareup.com",
    "report-uri /api/security/csp-report",
  ].join('; ');
  // ISS-014 FIX: Enforce CSP instead of Report-Only
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
  '/admin/forgot-password',
  '/admin/reset-password',
  '/api/admin/auth/login',
  '/api/admin/auth/logout',
  '/api/admin/auth/forgot-password',
  '/api/admin/auth/reset-password',
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
  const isVercelUrl = host.includes('vercel.app');
  const isProd = !isLocalhost && !host.includes('preview') && !isVercelUrl;
  
  if (!isLocalhost && !isVercelUrl && isProd) {
    // Force HTTPS
    if (req.nextUrl.protocol === 'http:') {
      url.protocol = 'https:';
      return NextResponse.redirect(url, 301);
    }
    
    // Redirect non-canonical domains to primary domain (only on custom domains)
    if (!host.includes('tasteofgratitude.shop')) {
      const canonicalUrl = new URL(pathname + url.search, 'https://tasteofgratitude.shop');
      return NextResponse.redirect(canonicalUrl, 301);
    }
  }

  // ISS-017 FIX: Block /diagnostic and /test-auth in production
  if (isProd && (pathname === '/diagnostic' || pathname === '/test-auth')) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Not found' }, { status: 404 })
    );
  }

  // Redirect legacy public routes to their canonical destinations.
  const legacyRouteRedirects: Record<string, string> = {
    '/products': '/catalog',
    '/cart': '/order', // ISS-009 FIX: /cart → /order (skip /checkout double redirect)
    '/checkout': '/order', // ISS-009 FIX: /checkout is unused, redirect to active /order route
    '/order-v2': '/order', // ISS-009 FIX: /order-v2 is unused re-export, redirect to active /order route
    '/account/orders': '/profile/orders',
    '/account': '/profile', // ISS-016 FIX: /account 404 → redirect to /profile
  };

  const redirectDestination = legacyRouteRedirects[pathname];
  if (redirectDestination) {
    url.pathname = redirectDestination;
    const redirectResponse = NextResponse.redirect(url, 301);
    return addSecurityHeaders(redirectResponse);
  }

  // Keep historical order detail links working by routing to the canonical success page.
  if (pathname.startsWith('/order/') && pathname !== '/order/success') {
    const orderRef = pathname.replace('/order/', '');
    if (orderRef) {
      url.pathname = '/order/success';
      url.searchParams.set('orderRef', orderRef);
      const redirectResponse = NextResponse.redirect(url, 301);
      return addSecurityHeaders(redirectResponse);
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
    
    // Token rotation: Refresh token if it's getting old (sliding window expiration)
    // This happens on every authenticated admin page request
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    const rotatedResponse = await refreshTokenIfNeeded(req, response);
    return addSecurityHeaders(rotatedResponse);
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

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const csrfHeader = req.headers.get('x-csrf-token');
      const csrfCookie = req.cookies.get('admin_csrf')?.value;
      if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
        return addSecurityHeaders(
          NextResponse.json(
            { success: false, error: 'Invalid CSRF token' },
            { status: 403 }
          )
        );
      }
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
