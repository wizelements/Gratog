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

  return NextResponse.next();
}

export const config = {
  matcher: ['/delivery', '/order', '/'],
};
