'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import QuickAddButton from '@/components/QuickAddButton';
import { QUIZ_QUESTIONS, getQuizRecommendation } from '@/data/quiz';
import { toStorefrontProduct } from '@/data/products';

const INITIAL_ANSWERS = {
  support: 'daily minerals',
  productType: 'not sure',
  frequency: 'trying for first time',
  avoid: 'none',
};

export default function QuizClient() {
  const [answers, setAnswers] = useState(INITIAL_ANSWERS);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', smsOptIn: true });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const recommendation = useMemo(() => getQuizRecommendation(answers), [answers]);

  const updateAnswer = (questionId, value) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer, answers }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Could not save quiz.');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Could not save quiz. You can still shop your recommendation below.');
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const primaryStorefront = toStorefrontProduct(recommendation.primary);
  const backupStorefront = toStorefrontProduct(recommendation.backup);

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-stone-950">
      <section className="border-b border-emerald-900/10 bg-gradient-to-b from-[#f6f2e8] via-[#fbfaf5] to-white py-12 sm:py-16">
        <div className="container max-w-5xl text-center">
          <p className="mb-4 inline-flex rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800 shadow-sm">
            Wellness quiz • personalized weekly path
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Find your Taste of Gratitude starting point.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-stone-700">
            Answer four quick questions. We&apos;ll recommend a product, a backup, and a bundle path for your routine.
          </p>
        </div>
      </section>

      <section className="container grid gap-8 py-10 lg:grid-cols-[1fr_0.9fr] lg:items-start lg:py-14">
        <form onSubmit={handleSubmit} className="rounded-[2rem] border border-emerald-900/10 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-emerald-700" aria-hidden="true" />
            <h2 className="text-2xl font-semibold text-stone-950">Your routine</h2>
          </div>

          <div className="space-y-7">
            {QUIZ_QUESTIONS.map((question) => (
              <fieldset key={question.id}>
                <legend className="mb-3 font-semibold text-stone-950">{question.question}</legend>
                <div className="flex flex-wrap gap-2">
                  {question.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateAnswer(question.id, option)}
                      className={`min-h-11 rounded-full px-4 text-sm font-semibold transition ${
                        answers[question.id] === option
                          ? 'bg-emerald-700 text-white'
                          : 'border border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}

            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="font-semibold text-emerald-950">Where should we send your results?</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Input value={customer.name} onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))} placeholder="Name (optional)" />
                <Input type="email" value={customer.email} onChange={(event) => setCustomer((current) => ({ ...current, email: event.target.value }))} placeholder="Email address" required />
                <Input type="tel" value={customer.phone} onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone for menu texts (optional)" />
                <label className="flex items-center gap-2 text-sm text-emerald-900">
                  <input type="checkbox" checked={customer.smsOptIn} onChange={(event) => setCustomer((current) => ({ ...current, smsOptIn: event.target.checked }))} />
                  Send weekly menu texts when SMS is connected
                </label>
              </div>
            </div>
          </div>

          {error && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-6 h-12 w-full rounded-full bg-emerald-700 text-white hover:bg-emerald-800">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Show my recommendations
          </Button>
        </form>

        <aside className="rounded-[2rem] border border-emerald-900/10 bg-white p-5 shadow-sm sm:p-7 lg:sticky lg:top-24">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Your match</p>
          <h2 className="mt-2 text-3xl font-semibold text-stone-950">{recommendation.primary.name}</h2>
          <p className="mt-3 leading-7 text-stone-700">{recommendation.reason}</p>
          {submitted && (
            <p className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Results saved. Your shopping path is ready.
            </p>
          )}

          <div className="mt-6 grid gap-4">
            <div className="rounded-2xl border border-stone-200 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Recommended product</p>
              <h3 className="mt-2 text-xl font-semibold text-stone-950">{recommendation.primary.name}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">{recommendation.primary.shortDescription}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {recommendation.primary.wellnessSupport.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-800">{tag}</span>)}
              </div>
              <QuickAddButton product={primaryStorefront} selectedVariant={primaryStorefront.variations?.[0]} className="mt-4 h-11 w-full rounded-full bg-emerald-700 text-white hover:bg-emerald-800" />
            </div>

            <div className="rounded-2xl border border-stone-200 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Backup product</p>
              <h3 className="mt-2 font-semibold text-stone-950">{recommendation.backup.name}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">{recommendation.backup.shortDescription}</p>
              <QuickAddButton product={backupStorefront} selectedVariant={backupStorefront.variations?.[0]} className="mt-4 h-11 w-full rounded-full bg-stone-900 text-white hover:bg-stone-800" />
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">Bundle suggestion</p>
              <h3 className="mt-2 font-semibold text-amber-950">{recommendation.bundle.name}</h3>
              <p className="mt-2 text-sm leading-6 text-amber-900">{recommendation.bundle.description}</p>
              <Link href="/catalog" className="mt-4 inline-flex items-center text-sm font-bold text-amber-950 underline-offset-4 hover:underline">
                Shop bundle products <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
