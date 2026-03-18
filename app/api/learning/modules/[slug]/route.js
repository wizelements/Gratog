import { NextResponse } from 'next/server';
import {
  LEARNING_PUBLIC_HEADERS,
  getPublishedLearningModuleBySlug,
  isValidLearningSlug
} from '@/lib/learning/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ERROR_HEADERS = {
  'Cache-Control': 'no-store, max-age=0'
};

export async function GET(_request, { params }) {
  try {
    const { slug: rawSlug } = await params;
    const slug = String(rawSlug || '').trim().toLowerCase();

    if (!isValidLearningSlug(slug)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid module slug.'
        },
        { status: 400, headers: LEARNING_PUBLIC_HEADERS }
      );
    }

    const learningModule = await getPublishedLearningModuleBySlug(slug);
    if (!learningModule) {
      return NextResponse.json(
        {
          success: false,
          error: 'Learning module not found.'
        },
        { status: 404, headers: LEARNING_PUBLIC_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        module: learningModule
      },
      { headers: LEARNING_PUBLIC_HEADERS }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load learning module.'
      },
      { status: 500, headers: ERROR_HEADERS }
    );
  }
}
