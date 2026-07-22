'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, ArrowRight, Package, Calendar, MapPin, Sparkles, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { track } from '@/utils/analytics';

interface MarketOption {
  id: string;
  name: string;
  pickupDays?: string;
}

interface BundleOption {
  id: string;
  slug: string;
  name: string;
  description: string;
  savingsText: string;
  cta: string;
}

interface GratitudeBoxPageProps {
  markets: MarketOption[];
  bundles: BundleOption[];
}

export default function GratitudeBoxPage({ markets, bundles }: GratitudeBoxPageProps) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    marketId: markets[0]?.id || '',
    bundleId: bundles[0]?.id || '',
    frequency: 'weekly',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email) {
      setError('Email is required to join the pilot waitlist');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/subscriptions/gratitude-box', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (data.success) {
        const nextPaymentUrl = data.payment?.url || '';
        setPaymentUrl(nextPaymentUrl);
        setSuccess(true);
        track('gratitude_box_submit', {
          marketId: form.marketId,
          bundleId: form.bundleId,
          frequency: form.frequency,
          status: nextPaymentUrl ? 'pending_payment' : 'waitlist',
        });
        if (nextPaymentUrl) {
          window.location.assign(nextPaymentUrl);
        }
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-stone-950">
      <section className="overflow-hidden border-b border-emerald-900/10 bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-950 text-white">
        <div className="container grid gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-50">
              Gratitude Box pilot / waitlist
            </p>
            <h1 className="max-w-4xl text-balance text-4xl font-semibold leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
              The Gratitude Box: a reserved market pickup box.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-emerald-50/90 sm:text-xl">
              A curated box of gels, drinks, and shots set aside at your market. Join the pilot: reserve one box at a time while we build recurring billing.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Pilot box', value: 'Reserved' },
                { label: 'Pickup', value: 'Your market' },
                { label: 'Commitment', value: 'One box at a time' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-emerald-100">{stat.label}</p>
                  <p className="mt-1 font-semibold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/20 bg-white/95 p-5 text-stone-950 shadow-2xl shadow-emerald-950/40">
            <div className="rounded-[1.5rem] bg-emerald-50 p-4">
              <Package className="h-6 w-6 text-emerald-700" aria-hidden="true" />
              <h2 className="mt-3 text-2xl font-semibold text-stone-950">Reserve your paid pilot box</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                If online payment is available, your first pilot box is reserved through secure Square checkout. If payment is not configured, we will keep you on the waitlist.
              </p>
              {success ? (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <CheckCircle className="h-8 w-8 text-emerald-600" aria-hidden="true" />
                  <p className="mt-3 font-semibold text-emerald-900">{paymentUrl ? 'Payment link ready.' : 'You are on the list.'}</p>
                  <p className="mt-1 text-sm text-emerald-700">
                    {paymentUrl
                      ? 'Complete secure Square checkout to reserve your first Gratitude Box pilot week.'
                      : 'We will email you before your first Gratitude Box pilot week.'}
                  </p>
                  {paymentUrl ? (
                    <Button asChild className="mt-4 rounded-full bg-emerald-700 text-white hover:bg-emerald-800">
                      <a href={paymentUrl}>Complete secure payment</a>
                    </Button>
                  ) : (
                    <Button asChild className="mt-4 rounded-full bg-emerald-700 text-white hover:bg-emerald-800">
                      <Link href="/weekly-menu">View this week&apos;s menu</Link>
                    </Button>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="name" className="text-stone-700">Name</Label>
                      <Input id="name" name="name" value={form.name} onChange={handleChange} placeholder="Your name" className="mt-1 rounded-xl" />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-stone-700">Phone</Label>
                      <Input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="(555) 123-4567" className="mt-1 rounded-xl" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-stone-700">Email *</Label>
                    <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" className="mt-1 rounded-xl" required />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="marketId" className="text-stone-700">Pickup market</Label>
                      <select
                        id="marketId"
                        name="marketId"
                        value={form.marketId}
                        onChange={handleChange}
                        className="mt-1 h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {markets.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="bundleId" className="text-stone-700">Preferred box</Label>
                      <select
                        id="bundleId"
                        name="bundleId"
                        value={form.bundleId}
                        onChange={handleChange}
                        className="mt-1 h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {bundles.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-full bg-emerald-700 py-6 text-white hover:bg-emerald-800"
                  >
                    {loading ? 'Creating secure checkout...' : 'Reserve my paid pilot box'}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                  <p className="text-xs text-stone-500">Secure Square checkout is used when payment is configured. Otherwise this saves a waitlist request only.</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">How it works</p>
            <h2 className="mt-2 text-3xl font-semibold text-stone-950 sm:text-4xl">A simple pilot process.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: Package, title: 'Pick your box', text: 'Choose a featured bundle or build your own mix for the week.' },
              { icon: Calendar, title: 'Set your market', text: 'We set aside your batch for pickup at your chosen market.' },
              { icon: Pause, title: 'Stay flexible', text: 'Pilot members can pause or skip before the next box cycle is billed.' },
            ].map(({ icon: Icon, title, text }, index) => (
              <div key={title} className="rounded-[1.5rem] border border-stone-200 bg-white p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-700 text-white">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Step {index + 1}</p>
                <h3 className="mt-2 text-lg font-semibold text-stone-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-emerald-900/10 bg-emerald-950 py-14 text-white">
        <div className="container grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <Sparkles className="h-8 w-8 text-emerald-200" aria-hidden="true" />
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Not ready for a subscription?</h2>
            <p className="mt-3 max-w-2xl text-emerald-50/90">
              Get the weekly menu by email with a direct preorder link. No spam. Unsubscribe anytime.
            </p>
          </div>
          <div className="flex justify-end">
            <Button asChild variant="outline" className="h-12 rounded-full border-white/30 bg-transparent px-8 text-white hover:bg-white/10">
              <Link href="/weekly-menu">Join weekly menu emails →</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
