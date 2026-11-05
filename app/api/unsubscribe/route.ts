export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { verifyUnsubscribeToken as verifyLegacyUnsubscribeToken } from '@/lib/email/service';
import { verifySignedEmail } from '@/lib/email/unsubscribe-tokens';
import { getMarketingClient, unsubscribeMarketingEmail } from '@/lib/marketing/turso-store.mjs';

function verifyToken(token: string): string | null {
  try {
    const signed = verifySignedEmail(token);
    if (signed) return signed;
    const legacy = verifyLegacyUnsubscribeToken(token);
    const email = typeof legacy?.email === 'string' ? legacy.email.trim().toLowerCase() : '';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  } catch {
    return null;
  }
}

const safeOk = () => NextResponse.json({ success: true, message: 'If that email was subscribed, it has been removed.' });
const failed = () => NextResponse.json({ success: false, error: 'Could not save your unsubscribe request. Please retry.' }, { status: 503 });
async function remove(email: string, source: string) {
  try {
    await unsubscribeMarketingEmail(getMarketingClient(), email, source);
    return safeOk();
  } catch (error) {
    logger.error('Unsubscribe', 'Failed to persist Turso suppression', { code: error instanceof Error ? error.message : 'unknown' });
    return failed();
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ success: false, error: 'Missing token' }, { status: 400 });
  const email = verifyToken(token);
  if (!email) return NextResponse.json({ success: false, error: 'Invalid unsubscribe link' }, { status: 400 });
  return remove(email, 'one_click_get');
}
export async function POST(request: NextRequest) {
  const data = await request.json().catch(() => null);
  if (!data || typeof data !== 'object') {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
  if (typeof data.token === 'string') {
    const email = verifyToken(data.token);
    if (!email) return NextResponse.json({ success: false, error: 'Invalid unsubscribe link' }, { status: 400 });
    return remove(email, 'one_click_post');
  }
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return safeOk();
  return remove(email, 'self_serve_post');
}
