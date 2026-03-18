import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import {
  LEARNING_PRIVATE_HEADERS,
  resolveAuthenticatedUserId,
  updateUserLessonProgress,
  validateLearningProgressPayload,
  validateSameOriginMutation
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

export async function PUT(request, { params }) {
  try {
    const sameOriginCheck = validateSameOriginMutation(request);
    if (!sameOriginCheck.valid) {
      return json(
        {
          success: false,
          error: sameOriginCheck.error
        },
        { status: 403 }
      );
    }

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

    const parsedBody = validateLearningProgressPayload(await request.json());
    if (!parsedBody.valid) {
      return json(
        {
          success: false,
          error: parsedBody.error
        },
        { status: 400 }
      );
    }

    const { slug } = await params;
    const result = await updateUserLessonProgress({
      userId,
      moduleSlug: slug,
      lessonId: parsedBody.data.lessonId,
      state: parsedBody.data.state,
      lastPositionSec: parsedBody.data.lastPositionSec
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

    if (result.status === 'invalid_lesson_id' || result.status === 'unknown_lesson') {
      return json(
        {
          success: false,
          error: 'Unknown lessonId for this module.'
        },
        { status: 400 }
      );
    }

    if (result.status === 'not_enrolled') {
      return json(
        {
          success: false,
          error: 'Enroll in this module before tracking progress.'
        },
        { status: 403 }
      );
    }

    return json({
      success: true,
      lessonProgress: result.lessonProgress,
      progress: result.progress,
      enrollment: result.enrollment,
      module: result.module
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
        error: 'Failed to update lesson progress.'
      },
      { status: 500 }
    );
  }
}
