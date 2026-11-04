export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { timingSafeEqual } from 'node:crypto';
import { getAdminSession } from '@/lib/admin-session';
import { getTursoAdminClient, ensureTursoAdminSchema, verifyAdminInTurso,
  changeTursoAdminPassword, logTursoAdminEvent } from '@/lib/auth/turso-admin-store.mjs';

const Schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128)
}).strict();
const fail = (status: number, error: string) =>
  NextResponse.json({ success: false, error }, { status, headers: { 'Cache-Control': 'no-store' } });
export async function POST(req: NextRequest) {
  if (req.headers.get('origin') !== req.nextUrl.origin) return fail(403, 'Invalid origin');
  const csrf = req.headers.get('x-csrf-token') || '';
  const cookie = req.cookies.get('admin_csrf')?.value || '';
  if (!csrf || !cookie || csrf.length !== cookie.length ||
      !timingSafeEqual(Buffer.from(csrf), Buffer.from(cookie))) return fail(403, 'Invalid security token');
  const input = Schema.safeParse(await req.json().catch(() => null));
  if (!input.success) return fail(400, 'New password must contain 12–128 characters.');
  if (input.data.currentPassword === input.data.newPassword) return fail(400, 'Choose a different password.');
  try {
    const claim = await getAdminSession(req);
    if (!claim) return fail(401, 'Sign in again');
    const db = getTursoAdminClient();
    await ensureTursoAdminSchema(db);
    const admin = await verifyAdminInTurso(db, claim);
    if (!admin) return fail(401, 'Sign in again');
    const updated = await changeTursoAdminPassword(db, admin, input.data.currentPassword, input.data.newPassword);
    if (!updated) return fail(403, 'Current password could not be verified.');
    await logTursoAdminEvent(db, String(admin.id), 'ADMIN_PASSWORD_CHANGED');
    const response = NextResponse.json({ success: true, message: 'Password changed. Please sign in again.' });
    for (const name of ['admin_token', 'admin_csrf']) response.cookies.set(name, '', {
      httpOnly: name === 'admin_token', secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', path: '/', maxAge: 0
    });
    return response;
  } catch (error) {
    console.error('TURSO_ADMIN_PASSWORD_CHANGE_UNAVAILABLE');
    return fail(503, 'Password change temporarily unavailable.');
  }
}
