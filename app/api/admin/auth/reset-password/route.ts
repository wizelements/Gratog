export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTursoAdminClient, ensureTursoAdminSchema, issueTursoAdminReset, consumeTursoAdminReset } from '@/lib/auth/turso-admin-store.mjs';
import { sendTursoAdminResetEmail } from '@/lib/auth/turso-admin-mailer.mjs';

const RequestReset = z.object({ email: z.string().email().max(254) }).strict();
const FinishReset = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/),
  newPassword: z.string().min(12).max(128) }).strict();
const safe = () => NextResponse.json({
  success: true,
  message: 'If that address belongs to an authorized administrator, check its inbox for a reset link.'
}, { headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: NextRequest) {
  if (Number(request.headers.get('content-length') || 0) > 4096) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 413 });
  }
  const body = await request.json().catch(() => null);
  const finishing = body && typeof body === 'object' && ('token' in body || 'newPassword' in body);
  try {
    const db = getTursoAdminClient();
    await ensureTursoAdminSchema(db);
    if (finishing) {
      const parsed = FinishReset.safeParse(body);
      if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid or expired reset request.' }, { status: 400 });
      const completed = await consumeTursoAdminReset(db, parsed.data.token, parsed.data.newPassword);
      return completed ? NextResponse.json({ success: true, message: 'Password reset. Sign in again.' }) :
        NextResponse.json({ success: false, error: 'Reset link invalid, expired, or already used.' }, { status: 400 });
    }
    const parsed = RequestReset.safeParse(body);
    if (!parsed.success) return safe(); // prevent administrator enumeration
    try {
      await issueTursoAdminReset(db, parsed.data.email.trim().toLowerCase(), sendTursoAdminResetEmail);
    } catch (error) {
      // Do not distinguish active from inactive addresses through email failures.
      console.error('TURSO_ADMIN_RESET_EMAIL_FAILED', error instanceof Error ? error.message : 'error');
    }
    return safe();
  } catch (error) {
    console.error('TURSO_ADMIN_RESET_UNAVAILABLE', error instanceof Error ? error.message : 'error');
    return NextResponse.json({
      success: false, error: 'Admin password recovery is temporarily unavailable.'
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
