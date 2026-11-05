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
  // GET must not unsubscribe: link scanners routinely prefetch email URLs.
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ success: false, error: 'Missing token' }, { status: 400 });
  if (!verifyToken(token)) return NextResponse.json({ success: false, error: 'Invalid unsubscribe link' }, { status: 400 });
  const url = new URL('/unsubscribe', request.url);
  url.searchParams.set('token', token);
  return NextResponse.redirect(url, { status: 303 });
}
export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  const urlToken = request.nextUrl.searchParams.get('token');
  let token: string | null = null;
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const form = await request.formData().catch(() => null);
    if (form?.get('List-Unsubscribe') !== 'One-Click') {
      return NextResponse.json({ success: false, error: 'Invalid one-click request' }, { status: 400 });
    }
    token = urlToken;
  } else if (contentType.includes('application/json')) {
    const data = await request.json().catch(() => null);
    token = typeof data?.token === 'string' ? data.token : null;
  } else {
    return NextResponse.json({ success: false, error: 'Unsupported content type' }, { status: 415 });
  }
  const email = token ? verifyToken(token) : null;
  if (!email) return NextResponse.json({ success: false, error: 'Invalid unsubscribe link' }, { status: 400 });
  return remove(email, 'one_click_post');
}
