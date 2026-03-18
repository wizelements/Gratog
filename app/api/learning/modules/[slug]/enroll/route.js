import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import {
  LEARNING_PRIVATE_HEADERS,
  enrollUserInLearningModule,
  resolveAuthenticatedUserId,
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

export async function POST(request, { params }) {
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

    const { slug } = await params;
    const result = await enrollUserInLearningModule({
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

    return json(
      {
        success: true,
        created: Boolean(result.created),
        module: result.module,
        enrollment: result.enrollment,
        progress: result.progress
      },
      { status: result.created ? 201 : 200 }
    );
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
        error: 'Failed to enroll in learning module.'
      },
      { status: 500 }
    );
  }
}
