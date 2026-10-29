export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getAdminSession } from '@/lib/admin-session';
import { validateCsrfToken, checkRateLimit } from '@/lib/auth/unified-admin';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';

const Schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128),
}).strict();

function fail(error: string, status: number, code?: string) {
  return NextResponse.json({ success: false, error, ...(code ? { code } : {}) }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  // An authenticated browser session AND proof of the existing password are required.
  const session = await getAdminSession(request);
  if (!session) return fail('Please sign in again.', 401);

  const origin = request.headers.get('origin');
  if (!origin || origin !== request.nextUrl.origin) {
    return fail('Invalid request origin.', 403, 'ORIGIN_INVALID');
  }
  if (!validateCsrfToken(request)) {
    return fail('Security token expired. Refresh the page and try again.', 403, 'CSRF_INVALID');
  }

  // Bounded per-user throttling. Cross-instance limits should additionally be
  // enforced at the edge for production deployments.
  const limit = checkRateLimit('admin-password-change:' + session.id, 5, 15 * 60 * 1000);
  if (!limit.allowed) return fail('Too many attempts. Try again in 15 minutes.', 429);

  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return fail('Enter your current password and a new password of at least 12 characters.', 400);

  const { currentPassword, newPassword } = parsed.data;
  if (currentPassword === newPassword) return fail('Choose a new password different from your current password.', 400);

  try {
    const { db } = await connectToDatabase();
    const email = session.email.toLowerCase();
    const admin = await db.collection('admin_users').findOne({ email, isActive: { $ne: false } });
    if (!admin || typeof admin.passwordHash !== 'string') return fail('Account could not be verified.', 401);

    if (!(await bcrypt.compare(currentPassword, admin.passwordHash))) {
      return fail('Current password is incorrect.', 403);
    }

    const hash = await bcrypt.hash(newPassword, 12);
    const updated = await db.collection('admin_users').updateOne(
      { _id: admin._id, passwordHash: admin.passwordHash },
      { $set: { passwordHash: hash, passwordUpdatedAt: new Date(), mustChangePassword: false } }
    );
    if (updated.modifiedCount !== 1) return fail('Account changed during update. Please try again.', 409);

    try {
      await db.collection('audit_logs').insertOne({
        timestamp: new Date(), adminId: session.id, adminEmail: email,
        action: 'ADMIN_PASSWORD_CHANGED', resource: 'auth', success: true,
      });
    } catch (auditError) {
      logger.error('AdminPasswordChange', 'Password updated but audit logging failed', auditError);
    }

    const response = NextResponse.json({ success: true, message: 'Password changed. Sign in using the new password.' }, { headers: { 'Cache-Control': 'no-store' } });
    for (const name of ['admin_token', 'admin_csrf']) {
      response.cookies.set(name, '', { httpOnly: name === 'admin_token', secure: true, sameSite: 'strict', path: '/', maxAge: 0 });
    }
    return response;
  } catch (error) {
    logger.error('AdminPasswordChange', 'Password update failed', error);
    return fail('Password change unavailable. Please try again later.', 503);
  }
}
