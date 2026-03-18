import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import {
  LEARNING_PRIVATE_HEADERS,
  getUserLearningModuleBySlug,
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

export async function GET(request, { params }) {
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

    const { slug } = await params;
    const result = await getUserLearningModuleBySlug({
      userId,
      moduleSlug: slug
    });

    if (result.status === 'invalid_slug') {
      return json(
        {
          success: false,
          error: 'Invalid module slug.'
        },
        { status: 400 }
      );
    }

    if (result.status === 'not_found') {
      return json(
        {
          success: false,
          error: 'Learning module not found.'
        },
        { status: 404 }
      );
    }

    if (result.status === 'not_enrolled') {
      return json(
        {
          success: false,
          error: 'Enrollment required before accessing learner content.',
          module: result.module
        },
        { status: 403 }
      );
    }

    return json({
      success: true,
      module: result.module,
      enrollment: result.enrollment,
      progress: result.progress
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
        error: 'Failed to load user learning module.'
      },
      { status: 500 }
    );
  }
}
