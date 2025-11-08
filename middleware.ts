import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = new URL(req.url);

  // Redirect old /delivery route to /order with tab param
  if (url.pathname === '/delivery') {
    url.pathname = '/order';
    url.searchParams.set('tab', 'delivery');
    return NextResponse.redirect(url, 301);
  }

  // Handle delivery disabled notice
  if (url.searchParams.get('notice') === 'delivery_off') {
    // Set a cookie for one-time toast display
    const res = NextResponse.next();
    res.cookies.set('notice', 'delivery_off', { 
      path: '/', 
      httpOnly: false,
      maxAge: 60 // 1 minute
    });
    return res;
  }

  // Protect admin pages (except login)
  if (url.pathname.startsWith('/admin') && url.pathname !== '/admin/login') {
    const token = req.cookies.get('admin_token')?.value;
    
    if (!token) {
      // Redirect to login if no token
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('redirect', url.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/delivery', '/', '/admin/:path*'],
};
