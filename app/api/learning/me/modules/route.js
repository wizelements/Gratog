import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import {
  LEARNING_PRIVATE_HEADERS,
  getUserLearningModules,
  resolveAuthenticatedUserId
} from '@/lib/learning/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function json(payload, init = {}) {
  return NextResponse.json(payload, {
    ...init,
    headers: {
      ...LEARNING_PRIVATE_HEADERS,
      ...(init.headers || {})
    }
  });
}

export async function GET(request) {
  try {
    const authPayload = await requireAuth(request);
    const userId = resolveAuthenticatedUserId(authPayload);

    if (!userId) {
      return json(
        {
          success: false,
          error: 'Authentication required.'
        },
        { status: 401 }
      );
    }

    const modules = await getUserLearningModules(userId);

    return json({
      success: true,
      modules,
      count: modules.length
    });
  } catch (error) {
    if (error?.message === 'Authentication required') {
      return json(
        {
          success: false,
          error: 'Authentication required.'
        },
        { status: 401 }
      );
    }

    return json(
      {
        success: false,
        error: 'Failed to load user learning modules.'
      },
      { status: 500 }
    );
  }
}
