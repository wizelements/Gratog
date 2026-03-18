'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  Lock,
  PlayCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

function flattenLessons(moduleData) {
  if (!moduleData || !Array.isArray(moduleData.sections)) {
    return [];
  }

  return moduleData.sections
    .slice()
    .sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
    .flatMap((section) => {
      const sectionLessons = Array.isArray(section.lessons) ? section.lessons : [];

      return sectionLessons
        .slice()
        .sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
        .map((lesson) => ({
          ...lesson,
          sectionId: section.id,
          sectionTitle: section.title
        }));
    });
}

function formatDuration(durationSec) {
  const minutes = Math.max(1, Math.round(Number(durationSec || 0) / 60));
  return `${minutes} min`;
}

function getNextLessonId(lessons, currentLessonId) {
  const currentIndex = lessons.findIndex((lesson) => lesson.id === currentLessonId);
  if (currentIndex < 0 || currentIndex + 1 >= lessons.length) {
    return null;
  }

  return lessons[currentIndex + 1].id;
}

export default function LearningModulePage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const moduleSlug = String(params?.slug || '').trim().toLowerCase();
  const [publicModule, setPublicModule] = useState(null);
  const [learnerModule, setLearnerModule] = useState(null);
  const [progress, setProgress] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [error, setError] = useState('');

  const activeModule = learnerModule || publicModule;
  const lessons = useMemo(() => flattenLessons(activeModule), [activeModule]);
  const activeLesson = useMemo(
    () => lessons.find((lesson) => lesson.id === selectedLessonId) || lessons[0] || null,
    [lessons, selectedLessonId]
  );

  const hasFullAccess = Boolean(learnerModule);
  const activeLessonProgress = activeLesson ? progress?.byLessonId?.[activeLesson.id] : null;
  const activeLessonLocked = Boolean(activeLesson && !hasFullAccess && !activeLesson.isPreview);

  const synchronizeSelectedLesson = useCallback((moduleData, preferredLessonId = null) => {
    const moduleLessons = flattenLessons(moduleData);
    if (moduleLessons.length === 0) {
      setSelectedLessonId(null);
      return;
    }

    setSelectedLessonId((previousLessonId) => {
      const previousExists = moduleLessons.some((lesson) => lesson.id === previousLessonId);
      if (previousExists) {
        return previousLessonId;
      }

      const preferredExists = moduleLessons.some((lesson) => lesson.id === preferredLessonId);
      if (preferredExists) {
        return preferredLessonId;
      }

      return moduleLessons[0].id;
    });
  }, []);

  const loadModule = useCallback(async () => {
    if (!moduleSlug) {
      setError('Missing learning module slug.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const publicResponse = await fetch(`/api/learning/modules/${encodeURIComponent(moduleSlug)}`, {
        cache: 'no-store'
      });
      const publicPayload = await publicResponse.json().catch(() => ({}));

      if (!publicResponse.ok || !publicPayload?.module) {
        setPublicModule(null);
        setLearnerModule(null);
        setEnrollment(null);
        setProgress(null);
        setError(publicPayload?.error || 'Unable to load this learning module.');
        setLoading(false);
        return;
      }

      setPublicModule(publicPayload.module);
      let moduleForSelection = publicPayload.module;
      let preferredLessonId = null;

      if (!isAuthenticated) {
        setLearnerModule(null);
        setEnrollment(null);
        setProgress(null);
      } else {
        const learnerResponse = await fetch(`/api/learning/me/modules/${encodeURIComponent(moduleSlug)}`, {
          cache: 'no-store'
        });

        const learnerPayload = await learnerResponse.json().catch(() => ({}));
        if (learnerResponse.ok && learnerPayload?.module) {
          setLearnerModule(learnerPayload.module);
          setEnrollment(learnerPayload.enrollment || null);
          setProgress(learnerPayload.progress || null);
          moduleForSelection = learnerPayload.module;
          preferredLessonId = learnerPayload.progress?.currentLessonId || null;
        } else if (learnerResponse.status === 403) {
          setLearnerModule(null);
          setEnrollment(null);
          setProgress(null);
        } else if (learnerResponse.status === 401) {
          setLearnerModule(null);
          setEnrollment(null);
          setProgress(null);
          setError('Please sign in again to access your learning progress.');
        } else {
          setLearnerModule(null);
          setEnrollment(null);
          setProgress(null);
          setError(learnerPayload?.error || 'Unable to load your learning progress right now.');
        }
      }

      synchronizeSelectedLesson(moduleForSelection, preferredLessonId);
    } catch (_error) {
      setError('Unable to load this learning module right now.');
      setPublicModule(null);
      setLearnerModule(null);
      setEnrollment(null);
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, moduleSlug, synchronizeSelectedLesson]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    loadModule();
  }, [authLoading, loadModule]);

  const updateLessonProgress = useCallback(
    async (lessonId, state, lastPositionSec = 0) => {
      const response = await fetch(`/api/learning/me/modules/${encodeURIComponent(moduleSlug)}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lessonId,
          state,
          lastPositionSec
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save lesson progress.');
      }

      if (payload.module) {
        setLearnerModule(payload.module);
      }
      if (payload.progress) {
        setProgress(payload.progress);
      }
      if (payload.enrollment) {
        setEnrollment(payload.enrollment);
      }

      return payload;
    },
    [moduleSlug]
  );

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setEnrolling(true);
    setError('');

    try {
      const response = await fetch(`/api/learning/modules/${encodeURIComponent(moduleSlug)}/enroll`, {
        method: 'POST'
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }

        throw new Error(payload?.error || 'Unable to enroll in this module.');
      }

      setLearnerModule(payload.module || null);
      setEnrollment(payload.enrollment || null);
      setProgress(payload.progress || null);
      synchronizeSelectedLesson(payload.module || publicModule, payload.progress?.currentLessonId || null);
    } catch (caughtError) {
      setError(caughtError.message || 'Unable to enroll in this module.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleStartLesson = async () => {
    if (!activeLesson || !hasFullAccess) {
      return;
    }

    if (savingProgress) {
      return;
    }

    setSavingProgress(true);
    setError('');
    try {
      await updateLessonProgress(activeLesson.id, 'in_progress', activeLessonProgress?.lastPositionSec || 0);
    } catch (caughtError) {
      setError(caughtError.message || 'Unable to start lesson.');
    } finally {
      setSavingProgress(false);
    }
  };

  const handleCompleteLesson = async () => {
    if (!activeLesson || !hasFullAccess) {
      return;
    }

    if (savingProgress) {
      return;
    }

    setSavingProgress(true);
    setError('');
    try {
      await updateLessonProgress(activeLesson.id, 'completed', Number(activeLesson.durationSec || 0));
      const nextLessonId = getNextLessonId(lessons, activeLesson.id);
      if (nextLessonId) {
        setSelectedLessonId(nextLessonId);
      }
    } catch (caughtError) {
      setError(caughtError.message || 'Unable to complete lesson.');
    } finally {
      setSavingProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4 py-12 flex justify-center">
          <div className="inline-flex items-center gap-3 text-emerald-700">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading module...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !activeModule) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4 py-12">
          <Link href="/explore/learn">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Learning Center
            </Button>
          </Link>
          <Card className="max-w-2xl mx-auto border-red-200">
            <CardHeader>
              <CardTitle className="text-red-700">Unable to load module</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <Link href="/explore/learn">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Learning Center
          </Button>
        </Link>

        {activeModule && (
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <Badge variant="outline">{activeModule.category}</Badge>
              <Badge variant="outline">{activeModule.difficulty}</Badge>
              <Badge variant="outline">{activeModule.lessonCount} lessons</Badge>
              <Badge variant="outline">{activeModule.estimatedMinutes} min total</Badge>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">{activeModule.title}</h1>
            <p className="text-lg text-gray-600 max-w-3xl">{activeModule.description}</p>
          </div>
        )}

        {!isAuthenticated && (
          <Card className="mb-6 border-emerald-200 bg-emerald-50">
            <CardContent className="py-5 flex flex-wrap items-center justify-between gap-4">
              <p className="text-emerald-800">
                Sign in to enroll, track lesson completion, and continue where you left off.
              </p>
              <div className="flex gap-2">
                <Link href="/login">
                  <Button className="bg-emerald-600 hover:bg-emerald-700">Sign In</Button>
                </Link>
                <Link href="/register">
                  <Button variant="outline">Create Account</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {isAuthenticated && !hasFullAccess && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="py-5 flex flex-wrap items-center justify-between gap-4">
              <p className="text-blue-900">
                You are viewing preview content. Enroll to unlock full lessons and progress tracking.
              </p>
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleEnroll}
                disabled={enrolling}
              >
                {enrolling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enrolling...
                  </>
                ) : (
                  'Enroll In Module'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {hasFullAccess && progress && (
          <Card className="mb-6 border-emerald-200">
            <CardContent className="py-5">
              <div className="flex flex-wrap justify-between gap-3 mb-3">
                <p className="text-sm text-emerald-700 font-semibold">Your Learning Progress</p>
                <p className="text-sm text-gray-600">
                  {progress.completedLessons}/{progress.totalLessons} lessons completed
                </p>
              </div>
              <Progress value={progress.percentComplete} className="h-2 bg-emerald-100 [&>div]:bg-emerald-600" />
              <p className="text-sm text-gray-600 mt-2">{progress.percentComplete}% complete</p>
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Lessons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lessons.map((lesson, index) => {
                const lessonProgress = progress?.byLessonId?.[lesson.id] || null;
                const isSelected = lesson.id === activeLesson?.id;
                const lessonLocked = !hasFullAccess && !lesson.isPreview;

                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className={`w-full text-left rounded-lg border px-3 py-3 transition-colors ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">Lesson {index + 1}</p>
                        <p className="text-sm font-semibold text-slate-900">{lesson.title}</p>
                      </div>
                      {lessonLocked ? (
                        <Lock className="w-4 h-4 text-slate-400 mt-1" />
                      ) : lessonProgress?.state === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-1" />
                      ) : (
                        <PlayCircle className="w-4 h-4 text-slate-400 mt-1" />
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <Clock3 className="w-3 h-3" />
                      <span>{formatDuration(lesson.durationSec)}</span>
                      {lesson.isPreview && <Badge variant="outline">Preview</Badge>}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{activeLesson?.title || 'Select a lesson'}</CardTitle>
            </CardHeader>
            <CardContent>
              {!activeLesson && <p className="text-gray-600">No lessons found for this module.</p>}

              {activeLesson && activeLessonLocked && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
                  <p className="font-semibold text-amber-900 mb-2">This lesson is locked</p>
                  <p className="text-amber-800 mb-4">
                    Enroll in this module to unlock the full lesson and keep your progress synced.
                  </p>
                  {isAuthenticated ? (
                    <Button
                      type="button"
                      className="bg-amber-600 hover:bg-amber-700"
                      onClick={handleEnroll}
                      disabled={enrolling}
                    >
                      {enrolling ? 'Enrolling...' : 'Unlock Full Lesson'}
                    </Button>
                  ) : (
                    <Link href="/login">
                      <Button type="button" className="bg-amber-600 hover:bg-amber-700">
                        Sign In To Continue
                      </Button>
                    </Link>
                  )}
                </div>
              )}

              {activeLesson && !activeLessonLocked && (
                <div className="space-y-5">
                  <p className="text-gray-600">{activeLesson.previewText}</p>

                  {(activeLesson.content?.paragraphs || []).map((paragraph) => (
                    <p key={paragraph} className="text-gray-800 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}

                  {(activeLesson.content?.keyTakeaways || []).length > 0 && (
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 mb-2">
                        Key Takeaways
                      </p>
                      <ul className="list-disc list-inside text-gray-700 space-y-1">
                        {activeLesson.content.keyTakeaways.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(activeLesson.content?.actionSteps || []).length > 0 && (
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 mb-2">
                        Action Steps
                      </p>
                      <ul className="list-disc list-inside text-gray-700 space-y-1">
                        {activeLesson.content.actionSteps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {hasFullAccess && (
                    <div className="pt-4 border-t border-slate-200 flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleStartLesson}
                        disabled={savingProgress || activeLessonProgress?.state === 'completed'}
                      >
                        {savingProgress ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : activeLessonProgress?.state === 'completed' ? (
                          'Already Completed'
                        ) : (
                          'Mark In Progress'
                        )}
                      </Button>
                      <Button
                        type="button"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={handleCompleteLesson}
                        disabled={savingProgress || activeLessonProgress?.state === 'completed'}
                      >
                        {activeLessonProgress?.state === 'completed' ? 'Completed' : 'Mark Lesson Complete'}
                      </Button>
                    </div>
                  )}

                  {!hasFullAccess && activeLesson.isPreview && (
                    <div className="pt-4 border-t border-slate-200">
                      <p className="text-sm text-slate-600 mb-3">
                        This preview is available to everyone. Enroll to unlock the complete learning path.
                      </p>
                      {isAuthenticated ? (
                        <Button
                          type="button"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={handleEnroll}
                          disabled={enrolling}
                        >
                          {enrolling ? 'Enrolling...' : 'Enroll To Continue'}
                        </Button>
                      ) : (
                        <Link href="/login">
                          <Button type="button" className="bg-emerald-600 hover:bg-emerald-700">
                            Sign In To Track Progress
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-semibold text-emerald-900 mb-2">Next Steps</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/explore/ingredients">
              <Button type="button" variant="outline" className="bg-white">
                Explore Ingredients
              </Button>
            </Link>
            <Link href="/explore/games">
              <Button type="button" variant="outline" className="bg-white">
                Try Learning Games
              </Button>
            </Link>
            <Link href="/explore/learn">
              <Button type="button" variant="outline" className="bg-white">
                Browse More Modules
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
