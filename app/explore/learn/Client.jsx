'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Beaker,
  BookOpen,
  Heart,
  Lightbulb,
  Loader2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const MODULE_ICON_BY_CATEGORY = {
  Foundations: BookOpen,
  Science: Beaker,
  'Health Benefits': Heart
};

const MODULE_COLOR_BY_CATEGORY = {
  Foundations: 'from-emerald-500 to-green-600',
  Science: 'from-blue-500 to-cyan-600',
  'Health Benefits': 'from-rose-500 to-pink-600'
};

function getModuleIcon(module) {
  return MODULE_ICON_BY_CATEGORY[module.category] || Lightbulb;
}

function getModuleGradient(module) {
  return module.themeGradient || MODULE_COLOR_BY_CATEGORY[module.category] || 'from-emerald-500 to-teal-600';
}

function getPreviewPoints(module) {
  const listedPreviewPoints = Array.isArray(module.previewPoints)
    ? module.previewPoints.filter(Boolean).slice(0, 3)
    : [];

  if (listedPreviewPoints.length > 0) {
    return listedPreviewPoints;
  }

  const previewLessons = (module.sections || [])
    .flatMap((section) => section.lessons || [])
    .filter((lesson) => lesson.isPreview && lesson.previewText)
    .slice(0, 3)
    .map((lesson) => lesson.previewText);

  if (previewLessons.length > 0) {
    return previewLessons;
  }

  return [
    'Track your progress across lessons with your personal learning journey.',
    'Unlock complete lesson content and save where you left off.',
    'Move from quick previews into deeper science-backed modules.'
  ];
}

function getModuleButtonLabel(module) {
  const percentComplete = Number(module.progress?.percentComplete || 0);
  if (percentComplete >= 100) {
    return 'Review Module';
  }

  if (percentComplete > 0) {
    return 'Continue Learning';
  }

  if (module.enrollment) {
    return 'Start Next Lesson';
  }

  return 'Start Learning';
}

export default function LearningCenterPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeModuleSlug, setActiveModuleSlug] = useState(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    let cancelled = false;

    async function loadLearningModules() {
      setLoading(true);
      setError('');

      try {
        const publicResponse = await fetch('/api/learning/modules?limit=24', {
          cache: 'no-store'
        });
        const publicPayload = await publicResponse.json().catch(() => ({}));

        if (!publicResponse.ok) {
          throw new Error(publicPayload?.error || 'Unable to load learning modules.');
        }

        const publicModules = Array.isArray(publicPayload?.modules) ? publicPayload.modules : [];
        let mergedModules = publicModules;
        let learnerLoadError = '';

        if (isAuthenticated) {
          const learnerResponse = await fetch('/api/learning/me/modules', {
            cache: 'no-store'
          });

          const learnerPayload = await learnerResponse.json().catch(() => ({}));

          if (learnerResponse.ok) {
            const learnerModules = Array.isArray(learnerPayload?.modules) ? learnerPayload.modules : [];
            const learnerMap = new Map(learnerModules.map((module) => [module.slug, module]));

            mergedModules = publicModules.map((module) => {
              const learnerModule = learnerMap.get(module.slug);
              if (!learnerModule) {
                return {
                  ...module,
                  enrollment: null,
                  progress: null
                };
              }

              return {
                ...module,
                enrollment: learnerModule.enrollment || null,
                progress: learnerModule.progress || null
              };
            });
          } else if (learnerResponse.status === 401) {
            learnerLoadError = 'Please sign in again to load your learning progress.';
          } else if (learnerResponse.status >= 500) {
            learnerLoadError = learnerPayload?.error || 'Unable to load your learning progress right now.';
          }
        } else {
          mergedModules = publicModules.map((module) => ({
            ...module,
            enrollment: null,
            progress: null
          }));
        }

        if (!cancelled) {
          setModules(mergedModules);
          if (learnerLoadError) {
            setError(learnerLoadError);
          }
        }
      } catch (caughtError) {
        if (!cancelled) {
          setModules([]);
          setError(caughtError.message || 'Unable to load learning modules.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLearningModules();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  const categories = useMemo(
    () => ['All', ...new Set(modules.map((module) => module.category))],
    [modules]
  );

  const visibleModules = useMemo(() => {
    if (activeCategory === 'All') {
      return modules;
    }

    return modules.filter((module) => module.category === activeCategory);
  }, [activeCategory, modules]);

  useEffect(() => {
    if (visibleModules.length === 0) {
      setActiveModuleSlug(null);
      return;
    }

    const activeStillVisible = visibleModules.some((module) => module.slug === activeModuleSlug);
    if (!activeStillVisible) {
      setActiveModuleSlug(visibleModules[0].slug);
    }
  }, [activeModuleSlug, visibleModules]);

  const activeModule = useMemo(
    () => visibleModules.find((module) => module.slug === activeModuleSlug) || null,
    [activeModuleSlug, visibleModules]
  );

  const enrolledModules = useMemo(
    () => modules.filter((module) => module.enrollment),
    [modules]
  );

  const totalLearningMinutes = useMemo(
    () => modules.reduce((sum, module) => sum + Number(module.estimatedMinutes || 0), 0),
    [modules]
  );

  const averageCompletion = useMemo(() => {
    if (enrolledModules.length === 0) {
      return 0;
    }

    const sum = enrolledModules.reduce(
      (total, module) => total + Number(module.progress?.percentComplete || 0),
      0
    );
    return Math.round(sum / enrolledModules.length);
  }, [enrolledModules]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <Link href="/explore">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Explore
          </Button>
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Learning Center
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Deep-dive into the science, benefits, and stories behind our ingredients
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="mb-8 flex items-center justify-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-4 text-emerald-800">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading learning journey...</span>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((category) => {
            const isActive = activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className="focus:outline-none"
                aria-pressed={isActive}
              >
                <Badge
                  variant={isActive ? 'default' : 'outline'}
                  className={isActive ? 'bg-emerald-600' : 'cursor-pointer hover:bg-emerald-50'}
                >
                  {category}
                </Badge>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {visibleModules.map((module) => {
            const Icon = getModuleIcon(module);
            const isActive = activeModuleSlug === module.slug;
            const progressPercent = Number(module.progress?.percentComplete || 0);

            return (
              <Card key={module.slug} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-3 rounded-lg bg-gradient-to-br ${getModuleGradient(module)}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="outline">{module.category}</Badge>
                  </div>
                  <CardTitle className="text-xl">{module.title}</CardTitle>
                  <CardDescription>{module.summary}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="space-y-3 mb-4">
                    <div className="flex gap-4 text-sm text-gray-500">
                      <span>{module.sectionCount} sections</span>
                      <span>•</span>
                      <span>{module.lessonCount} lessons</span>
                      <span>•</span>
                      <span>{module.estimatedMinutes} min</span>
                    </div>

                    {module.enrollment && (
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Your progress</span>
                          <span>{progressPercent}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-2 bg-emerald-100 [&>div]:bg-emerald-600" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
                    {module.enrollment ? (
                      <Badge variant="outline" className="border-emerald-300 text-emerald-700">
                        {progressPercent >= 100 ? 'Completed' : 'In Progress'}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Preview Available</Badge>
                    )}
                    <span>•</span>
                    <span>{module.difficulty}</span>
                  </div>

                  <Button
                    type="button"
                    variant={isActive ? 'outline' : 'ghost'}
                    className="w-full mb-2"
                    onClick={() => setActiveModuleSlug(module.slug)}
                  >
                    {isActive ? 'Hide Preview' : 'Show Preview'}
                  </Button>

                  <Button asChild className={`w-full bg-gradient-to-r ${getModuleGradient(module)} hover:opacity-90`}>
                    <Link href={`/explore/learn/${module.slug}`}>{getModuleButtonLabel(module)}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {visibleModules.length === 0 && !loading && (
          <div className="max-w-3xl mx-auto mt-8 rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-800">
            No modules found in this category yet. Select "All" to continue learning.
          </div>
        )}

        {activeModule && (
          <div className="max-w-4xl mx-auto mt-10 rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-2">Now Learning</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{activeModule.title}</h2>
            <p className="text-gray-600 mb-4">{activeModule.description}</p>
            <div className="space-y-2 text-sm text-gray-700">
              {getPreviewPoints(activeModule).map((point) => (
                <p key={point}>• {point}</p>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className={`bg-gradient-to-r ${getModuleGradient(activeModule)} hover:opacity-90`}>
                <Link href={`/explore/learn/${activeModule.slug}`}>Open Module</Link>
              </Button>
              <Link href="/explore/ingredients">
                <Button type="button" variant="outline">Explore Ingredients</Button>
              </Link>
              <Link href="/explore/games">
                <Button type="button" variant="outline">Try Learning Games</Button>
              </Link>
            </div>
          </div>
        )}

        {isAuthenticated && enrolledModules.length > 0 && (
          <Card className="mt-10 max-w-5xl mx-auto border-emerald-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Sparkles className="w-6 h-6 text-emerald-600" />
                Your Learning Journey
              </CardTitle>
              <CardDescription>
                Continue where you left off and keep building momentum.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enrolledModules.slice(0, 4).map((module) => (
                <div key={module.slug} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="font-semibold text-slate-900">{module.title}</p>
                    <Badge variant="outline">{module.progress?.percentComplete || 0}%</Badge>
                  </div>
                  <Progress
                    value={Number(module.progress?.percentComplete || 0)}
                    className="h-2 bg-emerald-100 [&>div]:bg-emerald-600"
                  />
                  <Button asChild variant="link" className="px-0 mt-2 text-emerald-700">
                    <Link href={`/explore/learn/${module.slug}`}>Continue Module</Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
          <div className="p-6 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="text-3xl font-bold text-emerald-600 mb-2">{modules.length}</div>
            <div className="text-gray-600">In-Depth Modules</div>
          </div>
          <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-3xl font-bold text-blue-600 mb-2">{totalLearningMinutes} min</div>
            <div className="text-gray-600">Total Learning Time</div>
          </div>
          <div className="p-6 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {isAuthenticated ? `${averageCompletion}%` : `${enrolledModules.length}`}
            </div>
            <div className="text-gray-600">{isAuthenticated ? 'Average Completion' : 'Journey Modules Started'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
