import { connectToDatabase } from '@/lib/db-optimized';
import { LEARNING_MODULE_SEED } from '@/lib/learning/default-modules';

const MODULE_COLLECTION = 'learning_modules';
const ENROLLMENT_COLLECTION = 'learning_enrollments';
const SLUG_REGEX = /^[a-z0-9-]{1,80}$/;
const LESSON_ID_REGEX = /^[a-z0-9_-]{1,64}$/;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 24;
const SEED_SYNC_INTERVAL_MS = 5 * 60 * 1000;

export const LEARNING_PUBLIC_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
};

export const LEARNING_PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
  Vary: 'Cookie'
};

let indexesEnsured = false;
let lastSeedSyncAt = 0;

function toIsoDate(value) {
  if (!value) {
    return null;
  }

  const dateValue = value instanceof Date ? value : new Date(value);
  return Number.isNaN(dateValue.getTime()) ? null : dateValue.toISOString();
}

function normalizeInteger(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.round(parsed));
}

function normalizeStringArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function normalizeLessonContent(content) {
  if (!content || typeof content !== 'object') {
    return {
      paragraphs: [],
      keyTakeaways: [],
      actionSteps: []
    };
  }

  return {
    paragraphs: normalizeStringArray(content.paragraphs),
    keyTakeaways: normalizeStringArray(content.keyTakeaways),
    actionSteps: normalizeStringArray(content.actionSteps)
  };
}

function normalizeLessonId(lessonId, sectionOrder, lessonOrder) {
  const candidate = String(lessonId || '').trim().toLowerCase();
  if (isValidLearningLessonId(candidate)) {
    return candidate;
  }

  return `lesson-${sectionOrder}-${lessonOrder}`;
}

function normalizeModuleForStorage(seedModule) {
  const now = new Date();
  const sections = Array.isArray(seedModule.sections)
    ? seedModule.sections.map((section, sectionIndex) => {
        const sectionOrder = normalizeInteger(section.order, sectionIndex + 1) || sectionIndex + 1;
        const lessons = Array.isArray(section.lessons)
          ? section.lessons.map((lesson, lessonIndex) => {
              const lessonOrder = normalizeInteger(lesson.order, lessonIndex + 1) || lessonIndex + 1;
              const normalizedDuration = normalizeInteger(lesson.durationSec, 0);
              const normalizedId = normalizeLessonId(lesson.id, sectionOrder, lessonOrder);

              return {
                id: normalizedId,
                title: String(lesson.title || '').trim(),
                order: lessonOrder,
                durationSec: normalizedDuration,
                isPreview: Boolean(lesson.isPreview),
                previewText: String(lesson.previewText || '').trim(),
                content: normalizeLessonContent(lesson.content)
              };
            })
          : [];

        lessons.sort((a, b) => a.order - b.order);

        return {
          id: String(section.id || `section-${sectionOrder}`).trim().toLowerCase(),
          title: String(section.title || '').trim(),
          order: sectionOrder,
          lessons
        };
      })
    : [];

  sections.sort((a, b) => a.order - b.order);

  const allLessons = flattenLessons({ sections });
  const totalSeconds = allLessons.reduce((sum, lesson) => sum + normalizeInteger(lesson.durationSec, 0), 0);
  const estimatedMinutes = Math.max(1, Math.round(totalSeconds / 60));

  return {
    slug: String(seedModule.slug || '').trim().toLowerCase(),
    title: String(seedModule.title || '').trim(),
    summary: String(seedModule.summary || '').trim(),
    description: String(seedModule.description || '').trim(),
    category: String(seedModule.category || 'General').trim(),
    difficulty: String(seedModule.difficulty || 'Beginner').trim(),
    themeGradient: String(seedModule.themeGradient || 'from-emerald-500 to-green-600').trim(),
    tags: normalizeStringArray(seedModule.tags),
    status: 'published',
    sections,
    lessonCount: allLessons.length,
    estimatedMinutes,
    publishedAt: now,
    createdAt: now,
    updatedAt: now
  };
}

export function isValidLearningSlug(value) {
  const slug = String(value || '').trim().toLowerCase();
  return SLUG_REGEX.test(slug);
}

export function isValidLearningLessonId(value) {
  const lessonId = String(value || '').trim().toLowerCase();
  if (!LESSON_ID_REGEX.test(lessonId)) {
    return false;
  }

  return !lessonId.includes('.') && !lessonId.includes('$');
}

export function resolveAuthenticatedUserId(authPayload) {
  const candidate = authPayload?.userId || authPayload?.sub || authPayload?.id;
  return String(candidate || '').trim();
}

export function validateSameOriginMutation(request) {
  const origin = request.headers.get('origin');

  if (!origin) {
    return { valid: true };
  }

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    if (originUrl.host !== requestUrl.host) {
      return {
        valid: false,
        error: 'Cross-origin requests are not allowed for this endpoint.'
      };
    }

    return { valid: true };
  } catch (_error) {
    return {
      valid: false,
      error: 'Invalid Origin header.'
    };
  }
}

export function validateLearningProgressPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, error: 'Request body must be a JSON object.' };
  }

  const allowedKeys = new Set(['lessonId', 'state', 'lastPositionSec']);
  const unknownKeys = Object.keys(payload).filter((key) => !allowedKeys.has(key));
  if (unknownKeys.length > 0) {
    return {
      valid: false,
      error: `Unsupported field: ${unknownKeys[0]}`
    };
  }

  const lessonId = String(payload.lessonId || '').trim().toLowerCase();
  if (!isValidLearningLessonId(lessonId)) {
    return {
      valid: false,
      error: 'lessonId must match /^[a-z0-9_-]{1,64}$/ and cannot include "." or "$".'
    };
  }

  const state = String(payload.state || '').trim();
  if (state !== 'in_progress' && state !== 'completed') {
    return {
      valid: false,
      error: 'state must be either "in_progress" or "completed".'
    };
  }

  let lastPositionSec = 0;
  if (payload.lastPositionSec !== undefined) {
    const parsedPosition = Number(payload.lastPositionSec);
    if (!Number.isFinite(parsedPosition) || parsedPosition < 0) {
      return {
        valid: false,
        error: 'lastPositionSec must be a non-negative number when provided.'
      };
    }

    lastPositionSec = Math.round(parsedPosition);
  }

  return {
    valid: true,
    data: {
      lessonId,
      state,
      lastPositionSec
    }
  };
}

export function flattenLessons(moduleDoc) {
  if (!moduleDoc || !Array.isArray(moduleDoc.sections)) {
    return [];
  }

  const flattened = [];

  const sortedSections = [...moduleDoc.sections].sort(
    (left, right) => normalizeInteger(left.order, 0) - normalizeInteger(right.order, 0)
  );

  sortedSections.forEach((section) => {
    if (!Array.isArray(section.lessons)) {
      return;
    }

    const sortedLessons = [...section.lessons].sort(
      (left, right) => normalizeInteger(left.order, 0) - normalizeInteger(right.order, 0)
    );

    sortedLessons.forEach((lesson) => {
      flattened.push({
        ...lesson,
        sectionId: section.id,
        sectionTitle: section.title
      });
    });
  });

  return flattened;
}

function findLessonById(moduleDoc, lessonId) {
  const lessons = flattenLessons(moduleDoc);
  return lessons.find((lesson) => lesson.id === lessonId) || null;
}

function sanitizeModuleSectionForPublic(section) {
  return {
    id: section.id,
    title: section.title,
    order: normalizeInteger(section.order, 0),
    lessons: (section.lessons || [])
      .slice()
      .sort((left, right) => normalizeInteger(left.order, 0) - normalizeInteger(right.order, 0))
      .map((lesson) => {
        const baseLesson = {
          id: lesson.id,
          title: lesson.title,
          order: normalizeInteger(lesson.order, 0),
          durationSec: normalizeInteger(lesson.durationSec, 0),
          isPreview: Boolean(lesson.isPreview),
          previewText: String(lesson.previewText || '').trim()
        };

        if (lesson.isPreview) {
          return {
            ...baseLesson,
            content: normalizeLessonContent(lesson.content),
            locked: false
          };
        }

        return {
          ...baseLesson,
          content: null,
          locked: true
        };
      })
  };
}

function sanitizeModuleSectionForLearner(section) {
  return {
    id: section.id,
    title: section.title,
    order: normalizeInteger(section.order, 0),
    lessons: (section.lessons || [])
      .slice()
      .sort((left, right) => normalizeInteger(left.order, 0) - normalizeInteger(right.order, 0))
      .map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        order: normalizeInteger(lesson.order, 0),
        durationSec: normalizeInteger(lesson.durationSec, 0),
        isPreview: Boolean(lesson.isPreview),
        previewText: String(lesson.previewText || '').trim(),
        content: normalizeLessonContent(lesson.content),
        locked: false
      }))
  };
}

function serializeBaseModule(moduleDoc) {
  return {
    slug: moduleDoc.slug,
    title: moduleDoc.title,
    summary: moduleDoc.summary,
    description: moduleDoc.description,
    category: moduleDoc.category,
    difficulty: moduleDoc.difficulty,
    themeGradient: moduleDoc.themeGradient,
    tags: normalizeStringArray(moduleDoc.tags),
    lessonCount: normalizeInteger(moduleDoc.lessonCount, 0),
    estimatedMinutes: normalizeInteger(moduleDoc.estimatedMinutes, 0),
    publishedAt: toIsoDate(moduleDoc.publishedAt),
    updatedAt: toIsoDate(moduleDoc.updatedAt)
  };
}

function isPublished(moduleDoc) {
  if (!moduleDoc || moduleDoc.status !== 'published') {
    return false;
  }

  if (!moduleDoc.publishedAt) {
    return true;
  }

  const publishDate = new Date(moduleDoc.publishedAt);
  if (Number.isNaN(publishDate.getTime())) {
    return true;
  }

  return publishDate.getTime() <= Date.now();
}

function normalizeProgressRecord(record) {
  const safeRecord = record && typeof record === 'object' ? record : null;
  const state = safeRecord?.state === 'completed'
    ? 'completed'
    : safeRecord?.state === 'in_progress'
      ? 'in_progress'
      : 'not_started';

  return {
    state,
    lastPositionSec: normalizeInteger(safeRecord?.lastPositionSec, 0),
    startedAt: toIsoDate(safeRecord?.startedAt),
    completedAt: toIsoDate(safeRecord?.completedAt),
    updatedAt: toIsoDate(safeRecord?.updatedAt)
  };
}

export function computeLearningProgressSnapshot(moduleDoc, enrollmentDoc = null) {
  const lessons = flattenLessons(moduleDoc);
  const totalLessons = lessons.length;
  const lessonProgressMap = enrollmentDoc?.lessonProgress && typeof enrollmentDoc.lessonProgress === 'object'
    ? enrollmentDoc.lessonProgress
    : {};

  const byLessonId = {};
  let completedLessons = 0;

  lessons.forEach((lesson) => {
    const normalizedRecord = normalizeProgressRecord(lessonProgressMap[lesson.id]);
    byLessonId[lesson.id] = normalizedRecord;
    if (normalizedRecord.state === 'completed') {
      completedLessons += 1;
    }
  });

  const percentComplete = totalLessons > 0
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  let currentLessonId = null;
  const preferredLessonId = enrollmentDoc?.lastAccessedLessonId
    ? String(enrollmentDoc.lastAccessedLessonId)
    : null;
  const preferredLessonState = preferredLessonId ? byLessonId[preferredLessonId]?.state : null;

  if (preferredLessonId && preferredLessonState && preferredLessonState !== 'completed') {
    currentLessonId = preferredLessonId;
  } else {
    const nextIncomplete = lessons.find((lesson) => {
      const lessonState = byLessonId[lesson.id]?.state || 'not_started';
      return lessonState !== 'completed';
    });

    if (nextIncomplete?.id) {
      currentLessonId = nextIncomplete.id;
    } else if (preferredLessonId && byLessonId[preferredLessonId]) {
      currentLessonId = preferredLessonId;
    } else {
      currentLessonId = lessons[0]?.id || null;
    }
  }

  return {
    completedLessons,
    totalLessons,
    percentComplete,
    currentLessonId,
    byLessonId
  };
}

function serializeEnrollment(enrollmentDoc = null) {
  if (!enrollmentDoc) {
    return null;
  }

  return {
    moduleSlug: enrollmentDoc.moduleSlug,
    enrolledAt: toIsoDate(enrollmentDoc.enrolledAt),
    updatedAt: toIsoDate(enrollmentDoc.updatedAt),
    completedAt: toIsoDate(enrollmentDoc.completedAt),
    lastAccessedLessonId: enrollmentDoc.lastAccessedLessonId || null
  };
}

function serializeModuleListItem(moduleDoc) {
  const base = serializeBaseModule(moduleDoc);
  const sectionCount = Array.isArray(moduleDoc.sections) ? moduleDoc.sections.length : 0;
  const previewPoints = flattenLessons(moduleDoc)
    .filter((lesson) => Boolean(lesson.isPreview) && Boolean(lesson.previewText))
    .slice(0, 3)
    .map((lesson) => lesson.previewText);

  return {
    ...base,
    sectionCount,
    previewPoints
  };
}

function serializePublicModule(moduleDoc) {
  return {
    ...serializeBaseModule(moduleDoc),
    sections: (moduleDoc.sections || [])
      .slice()
      .sort((left, right) => normalizeInteger(left.order, 0) - normalizeInteger(right.order, 0))
      .map((section) => sanitizeModuleSectionForPublic(section))
  };
}

function serializeLearnerModule(moduleDoc) {
  return {
    ...serializeBaseModule(moduleDoc),
    sections: (moduleDoc.sections || [])
      .slice()
      .sort((left, right) => normalizeInteger(left.order, 0) - normalizeInteger(right.order, 0))
      .map((section) => sanitizeModuleSectionForLearner(section))
  };
}

function sanitizeLimit(limitInput) {
  const parsedLimit = Number(limitInput);
  if (!Number.isFinite(parsedLimit)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(parsedLimit)));
}

function normalizeFilterValue(value) {
  const normalized = String(value || '').trim();
  return normalized.length > 0 ? normalized : null;
}

function moduleMatchesFilters(moduleDoc, filters) {
  if (!filters) {
    return true;
  }

  if (filters.category) {
    const moduleCategory = String(moduleDoc.category || '').trim().toLowerCase();
    if (moduleCategory !== filters.category.toLowerCase()) {
      return false;
    }
  }

  if (filters.tag) {
    const targetTag = filters.tag.toLowerCase();
    const tags = normalizeStringArray(moduleDoc.tags).map((tag) => tag.toLowerCase());
    if (!tags.includes(targetTag)) {
      return false;
    }
  }

  return true;
}

async function ensureLearningIndexes(db) {
  if (indexesEnsured) {
    return;
  }

  const modulesCollection = db.collection(MODULE_COLLECTION);
  const enrollmentsCollection = db.collection(ENROLLMENT_COLLECTION);

  if (typeof modulesCollection.createIndex === 'function') {
    await modulesCollection.createIndex({ slug: 1 }, { unique: true });
    await modulesCollection.createIndex({ status: 1, publishedAt: -1 });
  }

  if (typeof enrollmentsCollection.createIndex === 'function') {
    await enrollmentsCollection.createIndex({ userId: 1, moduleSlug: 1 }, { unique: true });
    await enrollmentsCollection.createIndex({ userId: 1, updatedAt: -1 });
  }

  indexesEnsured = true;
}

async function ensureLearningSeedData(db) {
  if (Date.now() - lastSeedSyncAt < SEED_SYNC_INTERVAL_MS) {
    return;
  }

  const modulesCollection = db.collection(MODULE_COLLECTION);

  for (const seedModule of LEARNING_MODULE_SEED) {
    const normalizedModule = normalizeModuleForStorage(seedModule);

    if (!isValidLearningSlug(normalizedModule.slug)) {
      continue;
    }

    try {
      const updateResult = await modulesCollection.updateOne(
        { slug: normalizedModule.slug },
        { $setOnInsert: normalizedModule },
        { upsert: true }
      );

      if (
        !updateResult?.upsertedId
        && Number(updateResult?.upsertedCount || 0) === 0
        && updateResult?.matchedCount === 0
        && updateResult?.modifiedCount === 0
      ) {
        const existing = await modulesCollection.findOne({ slug: normalizedModule.slug });
        if (!existing) {
          await modulesCollection.insertOne(normalizedModule);
        }
      }
    } catch (error) {
      const errorMessage = String(error?.message || '');
      if (!(error?.code === 11000 || errorMessage.includes('E11000'))) {
        throw error;
      }
    }
  }

  lastSeedSyncAt = Date.now();
}

async function ensureLearningStoreReady(db) {
  await ensureLearningIndexes(db);
  await ensureLearningSeedData(db);
}

async function listPublishedModuleDocs(db) {
  const modulesCollection = db.collection(MODULE_COLLECTION);
  const allModules = await modulesCollection.find({ status: 'published' }).toArray();

  return allModules
    .filter((moduleDoc) => isPublished(moduleDoc))
    .sort((left, right) => {
      const leftDate = new Date(left.publishedAt || 0).getTime();
      const rightDate = new Date(right.publishedAt || 0).getTime();
      if (rightDate !== leftDate) {
        return rightDate - leftDate;
      }

      return String(left.title || '').localeCompare(String(right.title || ''));
    });
}

async function findPublishedModuleDocBySlug(db, slug) {
  const modulesCollection = db.collection(MODULE_COLLECTION);
  const moduleDoc = await modulesCollection.findOne({ slug, status: 'published' });
  if (!isPublished(moduleDoc)) {
    return null;
  }

  return moduleDoc;
}

async function findEnrollmentForUser(db, userId, moduleSlug) {
  const enrollmentsCollection = db.collection(ENROLLMENT_COLLECTION);
  return enrollmentsCollection.findOne({ userId, moduleSlug });
}

function buildProgressWriteForFallback(existingProgress, requestedState, requestedPosition, lessonDurationSec) {
  const now = new Date();
  const previous = existingProgress && typeof existingProgress === 'object' ? existingProgress : null;
  const existingState = previous?.state === 'completed'
    ? 'completed'
    : previous?.state === 'in_progress'
      ? 'in_progress'
      : 'not_started';

  const boundedRequested = lessonDurationSec > 0
    ? Math.min(lessonDurationSec + 60, normalizeInteger(requestedPosition, 0))
    : normalizeInteger(requestedPosition, 0);
  const existingPosition = normalizeInteger(previous?.lastPositionSec, 0);

  let nextState = existingState;
  if (requestedState === 'completed') {
    nextState = 'completed';
  } else if (requestedState === 'in_progress' && existingState !== 'completed') {
    nextState = 'in_progress';
  }

  let nextPosition = Math.max(existingPosition, boundedRequested);
  if (nextState === 'completed' && lessonDurationSec > 0) {
    nextPosition = Math.max(nextPosition, lessonDurationSec);
  }

  return {
    state: nextState,
    lastPositionSec: nextPosition,
    startedAt: previous?.startedAt ? new Date(previous.startedAt) : now,
    completedAt: nextState === 'completed'
      ? previous?.completedAt
        ? new Date(previous.completedAt)
        : now
      : null,
    updatedAt: now
  };
}

export async function getPublishedLearningModules(options = {}) {
  const { db } = await connectToDatabase();
  await ensureLearningStoreReady(db);

  const limit = sanitizeLimit(options.limit);
  const filters = {
    category: normalizeFilterValue(options.category),
    tag: normalizeFilterValue(options.tag)
  };

  const modules = await listPublishedModuleDocs(db);
  const filtered = modules
    .filter((moduleDoc) => moduleMatchesFilters(moduleDoc, filters))
    .slice(0, limit)
    .map((moduleDoc) => serializeModuleListItem(moduleDoc));

  return filtered;
}

export async function getPublishedLearningModuleBySlug(moduleSlug) {
  const slug = String(moduleSlug || '').trim().toLowerCase();
  if (!isValidLearningSlug(slug)) {
    return null;
  }

  const { db } = await connectToDatabase();
  await ensureLearningStoreReady(db);

  const moduleDoc = await findPublishedModuleDocBySlug(db, slug);
  if (!moduleDoc) {
    return null;
  }

  return serializePublicModule(moduleDoc);
}

export async function enrollUserInLearningModule({ userId, moduleSlug }) {
  const normalizedUserId = String(userId || '').trim();
  const slug = String(moduleSlug || '').trim().toLowerCase();

  if (!normalizedUserId) {
    return { status: 'unauthorized' };
  }

  if (!isValidLearningSlug(slug)) {
    return { status: 'invalid_slug' };
  }

  const { db } = await connectToDatabase();
  await ensureLearningStoreReady(db);

  const moduleDoc = await findPublishedModuleDocBySlug(db, slug);
  if (!moduleDoc) {
    return { status: 'not_found' };
  }

  const enrollmentsCollection = db.collection(ENROLLMENT_COLLECTION);
  const firstLessonId = flattenLessons(moduleDoc)[0]?.id || null;
  const now = new Date();

  let created = false;

  try {
    const updateResult = await enrollmentsCollection.updateOne(
      { userId: normalizedUserId, moduleSlug: slug },
      {
        $setOnInsert: {
          userId: normalizedUserId,
          moduleSlug: slug,
          moduleTitle: moduleDoc.title,
          enrolledAt: now,
          updatedAt: now,
          completedAt: null,
          lastAccessedLessonId: firstLessonId,
          lessonProgress: {}
        },
        $set: {
          updatedAt: now,
          moduleTitle: moduleDoc.title
        }
      },
      { upsert: true }
    );

    created = Boolean(updateResult?.upsertedId) || Number(updateResult?.upsertedCount || 0) > 0;

    if (!created && updateResult?.matchedCount === 0 && updateResult?.modifiedCount === 0) {
      const existing = await enrollmentsCollection.findOne({ userId: normalizedUserId, moduleSlug: slug });
      if (!existing) {
        await enrollmentsCollection.insertOne({
          userId: normalizedUserId,
          moduleSlug: slug,
          moduleTitle: moduleDoc.title,
          enrolledAt: now,
          updatedAt: now,
          completedAt: null,
          lastAccessedLessonId: firstLessonId,
          lessonProgress: {}
        });
        created = true;
      }
    }
  } catch (error) {
    const errorMessage = String(error?.message || '');
    if (!(error?.code === 11000 || errorMessage.includes('E11000'))) {
      throw error;
    }
  }

  const enrollmentDoc = await findEnrollmentForUser(db, normalizedUserId, slug);
  const progress = computeLearningProgressSnapshot(moduleDoc, enrollmentDoc);

  return {
    status: 'ok',
    created,
    module: serializeLearnerModule(moduleDoc),
    enrollment: serializeEnrollment(enrollmentDoc),
    progress
  };
}

export async function getUserLearningModules(userId) {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) {
    return [];
  }

  const { db } = await connectToDatabase();
  await ensureLearningStoreReady(db);

  const enrollmentsCollection = db.collection(ENROLLMENT_COLLECTION);
  const enrollmentDocs = await enrollmentsCollection.find({ userId: normalizedUserId }).toArray();
  if (enrollmentDocs.length === 0) {
    return [];
  }

  const moduleSlugs = [...new Set(enrollmentDocs.map((entry) => String(entry.moduleSlug || '').trim()))].filter(Boolean);
  const modulesCollection = db.collection(MODULE_COLLECTION);
  const moduleDocs = await modulesCollection.find({ slug: { $in: moduleSlugs }, status: 'published' }).toArray();
  const moduleBySlug = new Map(moduleDocs.filter((moduleDoc) => isPublished(moduleDoc)).map((moduleDoc) => [moduleDoc.slug, moduleDoc]));

  return enrollmentDocs
    .slice()
    .sort((left, right) => {
      const leftDate = new Date(left.updatedAt || 0).getTime();
      const rightDate = new Date(right.updatedAt || 0).getTime();
      return rightDate - leftDate;
    })
    .map((enrollmentDoc) => {
      const moduleDoc = moduleBySlug.get(enrollmentDoc.moduleSlug);
      if (!moduleDoc) {
        return null;
      }

      const progress = computeLearningProgressSnapshot(moduleDoc, enrollmentDoc);
      return {
        ...serializeModuleListItem(moduleDoc),
        enrollment: serializeEnrollment(enrollmentDoc),
        progress
      };
    })
    .filter(Boolean);
}

export async function getUserLearningModuleBySlug({ userId, moduleSlug }) {
  const normalizedUserId = String(userId || '').trim();
  const slug = String(moduleSlug || '').trim().toLowerCase();

  if (!normalizedUserId) {
    return { status: 'unauthorized' };
  }

  if (!isValidLearningSlug(slug)) {
    return { status: 'invalid_slug' };
  }

  const { db } = await connectToDatabase();
  await ensureLearningStoreReady(db);

  const moduleDoc = await findPublishedModuleDocBySlug(db, slug);
  if (!moduleDoc) {
    return { status: 'not_found' };
  }

  const enrollmentDoc = await findEnrollmentForUser(db, normalizedUserId, slug);
  if (!enrollmentDoc) {
    return {
      status: 'not_enrolled',
      module: serializePublicModule(moduleDoc)
    };
  }

  const progress = computeLearningProgressSnapshot(moduleDoc, enrollmentDoc);

  return {
    status: 'ok',
    module: serializeLearnerModule(moduleDoc),
    enrollment: serializeEnrollment(enrollmentDoc),
    progress
  };
}

export async function updateUserLessonProgress({ userId, moduleSlug, lessonId, state, lastPositionSec }) {
  const normalizedUserId = String(userId || '').trim();
  const slug = String(moduleSlug || '').trim().toLowerCase();
  const normalizedLessonId = String(lessonId || '').trim().toLowerCase();

  if (!normalizedUserId) {
    return { status: 'unauthorized' };
  }

  if (!isValidLearningSlug(slug)) {
    return { status: 'invalid_slug' };
  }

  if (!isValidLearningLessonId(normalizedLessonId)) {
    return { status: 'invalid_lesson_id' };
  }

  const { db } = await connectToDatabase();
  await ensureLearningStoreReady(db);

  const moduleDoc = await findPublishedModuleDocBySlug(db, slug);
  if (!moduleDoc) {
    return { status: 'not_found' };
  }

  const lesson = findLessonById(moduleDoc, normalizedLessonId);
  if (!lesson) {
    return { status: 'unknown_lesson' };
  }

  const enrollmentsCollection = db.collection(ENROLLMENT_COLLECTION);
  const enrollmentDoc = await findEnrollmentForUser(db, normalizedUserId, slug);
  if (!enrollmentDoc) {
    return { status: 'not_enrolled' };
  }

  const lessonDuration = normalizeInteger(lesson.durationSec, 0);
  const requestedPosition = normalizeInteger(lastPositionSec, 0);
  const maxPosition = lessonDuration > 0 ? lessonDuration + 60 : requestedPosition;
  const boundedPosition = Math.min(maxPosition, requestedPosition);
  const now = new Date();

  const progressBasePath = `lessonProgress.${normalizedLessonId}`;
  const progressStatePath = `${progressBasePath}.state`;
  const progressStartedAtPath = `${progressBasePath}.startedAt`;
  const progressCompletedAtPath = `${progressBasePath}.completedAt`;
  const progressUpdatedAtPath = `${progressBasePath}.updatedAt`;
  const progressLastPositionPath = `${progressBasePath}.lastPositionSec`;
  const supportsAdvancedOperators = typeof enrollmentsCollection.createIndex === 'function';

  if (!supportsAdvancedOperators) {
    const existingProgress = enrollmentDoc.lessonProgress?.[normalizedLessonId] || null;
    const resolvedProgress = buildProgressWriteForFallback(
      existingProgress,
      state,
      boundedPosition,
      lessonDuration
    );

    await enrollmentsCollection.updateOne(
      {
        userId: normalizedUserId,
        moduleSlug: slug
      },
      {
        $set: {
          [progressBasePath]: resolvedProgress,
          lastAccessedLessonId: normalizedLessonId,
          updatedAt: now
        }
      }
    );
  } else if (state === 'in_progress') {
    await enrollmentsCollection.updateOne(
      {
        userId: normalizedUserId,
        moduleSlug: slug,
        [progressStatePath]: { $ne: 'completed' }
      },
      {
        $set: {
          [progressStatePath]: 'in_progress',
          [progressUpdatedAtPath]: now,
          lastAccessedLessonId: normalizedLessonId,
          updatedAt: now
        },
        $max: {
          [progressLastPositionPath]: boundedPosition
        }
      }
    );

    await enrollmentsCollection.updateOne(
      {
        userId: normalizedUserId,
        moduleSlug: slug,
        [progressStatePath]: { $ne: 'completed' },
        [progressStartedAtPath]: { $exists: false }
      },
      {
        $set: {
          [progressStartedAtPath]: now,
          [progressUpdatedAtPath]: now,
          updatedAt: now
        }
      }
    );
  } else {
    const completionPosition = lessonDuration > 0 ? Math.max(boundedPosition, lessonDuration) : boundedPosition;

    await enrollmentsCollection.updateOne(
      {
        userId: normalizedUserId,
        moduleSlug: slug
      },
      {
        $set: {
          [progressStatePath]: 'completed',
          [progressUpdatedAtPath]: now,
          lastAccessedLessonId: normalizedLessonId,
          updatedAt: now
        },
        $max: {
          [progressLastPositionPath]: completionPosition
        }
      }
    );

    await enrollmentsCollection.updateOne(
      {
        userId: normalizedUserId,
        moduleSlug: slug,
        [progressStartedAtPath]: { $exists: false }
      },
      {
        $set: {
          [progressStartedAtPath]: now,
          [progressUpdatedAtPath]: now,
          updatedAt: now
        }
      }
    );

    await enrollmentsCollection.updateOne(
      {
        userId: normalizedUserId,
        moduleSlug: slug,
        [progressCompletedAtPath]: { $exists: false }
      },
      {
        $set: {
          [progressCompletedAtPath]: now,
          [progressUpdatedAtPath]: now,
          updatedAt: now
        }
      }
    );
  }

  const refreshedEnrollment = await findEnrollmentForUser(db, normalizedUserId, slug);
  const progress = computeLearningProgressSnapshot(moduleDoc, refreshedEnrollment);

  const completedAt = progress.percentComplete === 100
    ? refreshedEnrollment?.completedAt || new Date()
    : null;

  if (completedAt && !refreshedEnrollment?.completedAt) {
    await enrollmentsCollection.updateOne(
      { userId: normalizedUserId, moduleSlug: slug },
      { $set: { completedAt, updatedAt: new Date() } }
    );
  }

  const updatedEnrollment = await findEnrollmentForUser(db, normalizedUserId, slug);
  const updatedProgress = computeLearningProgressSnapshot(moduleDoc, updatedEnrollment);

  return {
    status: 'ok',
    module: serializeLearnerModule(moduleDoc),
    enrollment: serializeEnrollment(updatedEnrollment),
    progress: updatedProgress,
    lessonProgress: normalizeProgressRecord(updatedEnrollment?.lessonProgress?.[normalizedLessonId])
  };
}
