import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_PATHS = ['/catalog', '/', '/product'];

export async function POST(request) {
  try {
    const secret = process.env.REVALIDATION_SECRET;
    if (!secret) {
      logger.error('REVALIDATION_SECRET is not configured');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));

    const internalHeader = request.headers.get('x-internal-revalidate');
    const isInternalCall = internalHeader === 'true' && body.secret === secret;
    const isAuthorized = body.secret === secret;

    if (!isAuthorized && !isInternalCall) {
      logger.warn('Revalidation rejected: invalid secret');
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    const paths = Array.isArray(body.paths) && body.paths.length > 0
      ? body.paths
      : DEFAULT_PATHS;

    logger.info('Revalidating paths', { paths, internal: isInternalCall });

    for (const path of paths) {
      revalidatePath(path);
    }

    logger.info('Revalidation complete', { paths });

    return NextResponse.json({ revalidated: true, paths });
  } catch (error) {
    logger.error('Revalidation failed', { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
