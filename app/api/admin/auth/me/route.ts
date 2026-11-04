export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-session';
import { getTursoAdminClient, ensureTursoAdminSchema, verifyAdminInTurso } from '@/lib/auth/turso-admin-store.mjs';

export async function GET(request: NextRequest) {
  try {
    const claim = await getAdminSession(request);
    if (!claim) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    const db = getTursoAdminClient();
    await ensureTursoAdminSchema(db);
    const admin = await verifyAdminInTurso(db, claim);
    if (!admin) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });
    return NextResponse.json({
      success: true, user: { id: admin.id, email: admin.email, role: admin.role, name: admin.name }
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ success: false, error: 'Admin session unavailable' }, { status: 503 });
  }
}
