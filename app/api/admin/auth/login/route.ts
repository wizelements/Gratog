export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes, createHash } from 'node:crypto';
import { generateAdminToken } from '@/lib/admin-session';
import { getTursoAdminClient, ensureTursoAdminSchema, authenticateTursoAdmin, logTursoAdminEvent } from '@/lib/auth/turso-admin-store.mjs';

const Login = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
  rememberMe: z.boolean().optional().default(false)
}).strict();
const WINDOW = 15 * 60 * 1000;

async function takeAttempt(db: any, ip: string) {
  const key = createHash('sha256').update(ip).digest('hex');
  const now = Date.now();
  await db.execute('CREATE TABLE IF NOT EXISTS tog_admin_login_limits (ip_hash TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL)');
  await db.execute({
    sql: "INSERT INTO tog_admin_login_limits (ip_hash,count,expires_at) VALUES (?,1,?) ON CONFLICT(ip_hash) DO UPDATE SET count=CASE WHEN expires_at<? THEN 1 ELSE count+1 END,expires_at=CASE WHEN expires_at<? THEN excluded.expires_at ELSE expires_at END",
    args: [key, now + WINDOW, now, now]
  });
  const rs = await db.execute({ sql: 'SELECT count FROM tog_admin_login_limits WHERE ip_hash=?', args: [key] });
  return { key, allowed: Number(rs.rows[0]?.count) <= 5 };
}
const fail = (status = 401, error = 'Invalid credentials') =>
  NextResponse.json({ success: false, error }, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: NextRequest) {
  if (Number(request.headers.get('content-length') || 0) > 4096) return fail(413, 'Invalid request');
  const data = Login.safeParse(await request.json().catch(() => null));
  if (!data.success) return fail(400, 'Invalid credentials');
  try {
    const db = getTursoAdminClient();
    await ensureTursoAdminSchema(db);
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    const rate = await takeAttempt(db, ip);
    if (!rate.allowed) return fail(429, 'Too many attempts. Please try again later.');
    const account = await authenticateTursoAdmin(db, data.data.email.trim().toLowerCase(), data.data.password);
    if (!account) return fail();

    const updated = await db.execute({
      sql: 'UPDATE tog_admin_users SET last_login_at=? WHERE id=? AND session_version=? AND is_active=1',
      args: [Date.now(), account.id, account.session_version]
    });
    if (Number(updated.rowsAffected) !== 1) return fail(409, 'Account changed. Try again.');
    await db.execute({ sql: 'DELETE FROM tog_admin_login_limits WHERE ip_hash=?', args: [rate.key] });
    await logTursoAdminEvent(db, account.id, 'ADMIN_LOGIN_SUCCESS');
    const token = await generateAdminToken({
      id: String(account.id), email: String(account.email),
      role: account.role as 'admin' | 'super_admin', name: String(account.name),
      sessionVersion: Number(account.session_version)
    });
    const response = NextResponse.json({
      success: true,
      user: { id: account.id, email: account.email, role: account.role,
        name: account.name, mustChangePassword: Number(account.must_change_password) === 1 }
    }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set('admin_token', token, {
      httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production',
      path: '/', maxAge: 7 * 86400
    });
    response.cookies.set('admin_csrf', randomBytes(32).toString('hex'), {
      httpOnly: false, sameSite: 'strict', secure: process.env.NODE_ENV === 'production',
      path: '/', maxAge: 7 * 86400
    });
    return response;
  } catch (error) {
    console.error('TURSO_ADMIN_LOGIN_UNAVAILABLE', error instanceof Error ? error.message : 'error');
    return fail(503, 'Admin login is temporarily unavailable.');
  }
}
