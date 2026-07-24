export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { connectToDatabase } from '@/lib/db-optimized';
import { getQuizRecommendation } from '@/data/quiz';
import { logger } from '@/lib/logger';

const QuizSchema = z.object({
  customer: z.object({
    name: z.string().max(120).optional().or(z.literal('')),
    email: z.string().email(),
  }),
  answers: z.object({
    support: z.string().min(1),
    productType: z.string().min(1),
    frequency: z.string().min(1),
    avoid: z.string().optional().default('none'),
  }),
});

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = QuizSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { customer, answers } = parsed.data;
  const recommendation = getQuizRecommendation(answers);
  const quizId = randomUUID();
  const now = new Date();
  const normalizedEmail = customer.email.toLowerCase().trim();

  try {
    const { db } = await connectToDatabase();
    await db.collection('quiz_results').insertOne({
      _id: quizId,
      customer: {
        name: customer.name?.trim() || null,
        email: normalizedEmail,
      },
      answers,
      recommendations: {
        primary: recommendation.primary.id,
        backup: recommendation.backup.id,
        bundle: recommendation.bundle.id,
        reason: recommendation.reason,
      },
      source: 'product_quiz',
      createdAt: now,
      updatedAt: now,
    });

    await db.collection('lead_intents').updateOne(
      { email: normalizedEmail, intent: 'product_quiz' },
      {
        $set: {
          email: normalizedEmail,
          name: customer.name?.trim() || null,
          intent: 'product_quiz',
          source: 'quiz',
          metadata: { answers, recommendation: recommendation.primary.id },
          updatedAt: now,
          status: 'new',
        },
        $setOnInsert: { id: randomUUID(), createdAt: now },
      },
      { upsert: true }
    );
  } catch (error) {
    logger.warn('Quiz', 'Quiz completed but persistence failed', {
      quizId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return NextResponse.json({ success: true, quizId, recommendation });
}
