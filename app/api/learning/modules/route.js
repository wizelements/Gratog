import { NextResponse } from 'next/server';
import {
  LEARNING_PUBLIC_HEADERS,
  getPublishedLearningModules
} from '@/lib/learning/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ERROR_HEADERS = {
  'Cache-Control': 'no-store, max-age=0'
};

function parsePositiveLimit(rawValue) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.max(1, Math.floor(parsed));
}

function normalizeOptionalFilter(rawValue) {
  const normalized = String(rawValue || '').trim();
  return normalized.length > 0 ? normalized : undefined;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const modules = await getPublishedLearningModules({
      limit: parsePositiveLimit(searchParams.get('limit')),
      category: normalizeOptionalFilter(searchParams.get('category')),
      tag: normalizeOptionalFilter(searchParams.get('tag'))
    });

    return NextResponse.json(
      {
        success: true,
        modules,
        count: modules.length
      },
      { headers: LEARNING_PUBLIC_HEADERS }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load learning modules.'
      },
      { status: 500, headers: ERROR_HEADERS }
    );
  }
}
