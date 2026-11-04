import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client/web';
import { verifyAdminToken } from '@/lib/admin-session';

let edgeTurso: ReturnType<typeof createClient> | null = null;

const PUBLIC_ADMIN_ROUTES = ['/admin/login', '/admin/forgot-password', '/admin/reset-password'];
const PUBLIC_ADMIN_API_ROUTES = [
  '/api/admin/auth/login', '/api/admin/auth/logout', '/api/admin/auth/reset-password',
];
const isPublic = (path: string) => [...PUBLIC_ADMIN_ROUTES, ...PUBLIC_ADMIN_API_ROUTES]
  .some(entry => path === entry || path.startsWith(entry + '/'));

function deny(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith('/api/admin')) {
    return NextResponse.json({ success: false, error: 'Unauthorized', code: 'ADMIN_AUTH_REQUIRED' }, { status: 401 });
  }
  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

// All protected admin requests are bound to Turso's current session epoch.
// A signed but revoked JWT, missing database, or inaccessible Turso fails closed.
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!path.startsWith('/admin') && !path.startsWith('/api/admin')) return NextResponse.next();
  if (isPublic(path)) return NextResponse.next();

  const token = request.cookies.get('admin_token')?.value;
  const session = token ? await verifyAdminToken(token) : null;
  if (!session?.id || !session.sessionVersion) return deny(request);

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken || !/^(libsql|https):\/\//.test(url) ||
      (process.env.VERCEL_ENV === 'production' && /staging|preview|migration-cert|sandbox/i.test(url))) {
    return deny(request);
  }
  try {
    const db = edgeTurso || (edgeTurso = createClient({ url, authToken }));
    const rs = await db.execute({
      sql: 'SELECT id FROM tog_admin_users WHERE id=? AND email=? AND role=? AND is_active=1 AND session_version=? LIMIT 1',
      args: [session.id, session.email, session.role, session.sessionVersion]
    });
    if (rs.rows.length !== 1) return deny(request);
    return NextResponse.next();
  } catch {
    return deny(request);
  }
}
export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };
