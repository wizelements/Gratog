import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request) {
  try {
    const report = await request.json();
    logger.warn('Security', 'CSP report-only violation', report);
    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Security', 'Failed to parse CSP report', error);
    return NextResponse.json({ received: false }, { status: 400 });
  }
}
