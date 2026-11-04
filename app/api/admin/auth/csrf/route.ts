export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getAdminSession } from '@/lib/admin-session';
import { getTursoAdminClient, ensureTursoAdminSchema, verifyAdminInTurso } from '@/lib/auth/turso-admin-store.mjs';

export async function GET(req: NextRequest) {
  try {
    const claim = await getAdminSession(req);
    if (!claim) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    const db = getTursoAdminClient();
    await ensureTursoAdminSchema(db);
    if (!(await verifyAdminInTurso(db, claim))) {
      return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });
    }
    const csrfToken = randomBytes(32).toString('hex');
    const response = NextResponse.json({ success: true, csrfToken }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set('admin_csrf', csrfToken, {
      httpOnly: false, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', path: '/', maxAge: 7 * 86400
    });
    return response;
  } catch {
    return NextResponse.json({ success: false, error: 'Security token unavailable' }, { status: 503 });
  }
}
