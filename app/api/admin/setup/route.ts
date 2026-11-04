// Setup via the former MongoDB endpoint is intentionally disabled.
// Turso seeds only the two owner inboxes with no default passwords, which
// must be claimed by the individual owners using signed email reset links.
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json({ success: true, disabled: true, setupRequired: false, provider: 'turso' },
    { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST() {
  return NextResponse.json({ success: false, error: 'Public admin setup is disabled. Use secure email recovery.' },
    { status: 403, headers: { 'Cache-Control': 'no-store' } });
}
