import { describe, expect, it } from 'vitest';
import { LEARNING_MODULE_SEED } from '@/lib/learning/default-modules';
import {
  computeLearningProgressSnapshot,
  isValidLearningLessonId,
  isValidLearningSlug,
  validateLearningProgressPayload
} from '@/lib/learning/service';

describe('learning-center service helpers', () => {
  it('validates slug and lesson identifiers with safe constraints', () => {
    expect(isValidLearningSlug('sea-moss-101')).toBe(true);
    expect(isValidLearningSlug('Sea Moss 101')).toBe(false);
    expect(isValidLearningLessonId('lesson-1_intro')).toBe(true);
    expect(isValidLearningLessonId('lesson.with.dot')).toBe(false);
    expect(isValidLearningLessonId('$lesson')).toBe(false);
  });

  it('enforces strict progress payload validation', () => {
    const validPayload = validateLearningProgressPayload({
      lessonId: 'where-sea-moss-grows',
      state: 'in_progress',
      lastPositionSec: 120
    });

    expect(validPayload.valid).toBe(true);
    expect(validPayload.data).toMatchObject({
      lessonId: 'where-sea-moss-grows',
      state: 'in_progress',
      lastPositionSec: 120
    });

    const invalidPayload = validateLearningProgressPayload({
      lessonId: 'where-sea-moss-grows',
      state: 'completed',
      percentComplete: 100
    });

    expect(invalidPayload.valid).toBe(false);
    expect(invalidPayload.error).toContain('Unsupported field');
  });

  it('computes module progress snapshots from lesson state safely', () => {
    const firstModule = LEARNING_MODULE_SEED[0];
    const lessonIds = firstModule.sections.flatMap((section) =>
      section.lessons.map((lesson) => lesson.id)
    );

    const snapshot = computeLearningProgressSnapshot(firstModule as any, {
      lastAccessedLessonId: lessonIds[1],
      lessonProgress: {
        [lessonIds[0]]: {
          state: 'completed',
          lastPositionSec: 300,
          completedAt: new Date()
        },
        [lessonIds[1]]: {
          state: 'in_progress',
          lastPositionSec: 120
        }
      }
    } as any);

    expect(snapshot.totalLessons).toBe(lessonIds.length);
    expect(snapshot.completedLessons).toBe(1);
    expect(snapshot.currentLessonId).toBe(lessonIds[1]);
    expect(snapshot.byLessonId[lessonIds[0]].state).toBe('completed');
    expect(snapshot.byLessonId[lessonIds[1]].state).toBe('in_progress');
  });

  it('keeps the last accessed lesson when a module is fully complete', () => {
    const firstModule = LEARNING_MODULE_SEED[0];
    const lessonIds = firstModule.sections.flatMap((section) =>
      section.lessons.map((lesson) => lesson.id)
    );

    const lessonProgress = lessonIds.reduce((accumulator, lessonId) => {
      accumulator[lessonId] = {
        state: 'completed',
        lastPositionSec: 999,
        completedAt: new Date()
      };
      return accumulator;
    }, {} as Record<string, any>);

    const snapshot = computeLearningProgressSnapshot(firstModule as any, {
      lastAccessedLessonId: lessonIds[lessonIds.length - 1],
      lessonProgress
    } as any);

    expect(snapshot.percentComplete).toBe(100);
    expect(snapshot.currentLessonId).toBe(lessonIds[lessonIds.length - 1]);
  });
});
