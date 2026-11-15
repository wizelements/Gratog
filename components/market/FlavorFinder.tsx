'use client';

import { useState } from 'react';
import type { MarketQrItem } from '@/lib/market-qr-policy';
import {
  findMarketFlavors,
  type FlavorDirection,
  type IngredientToAvoid,
} from '@/lib/market-flavor-finder';

type Props = { lemonades: MarketQrItem[] };

const DIRECTIONS: Array<{ value: FlavorDirection; label: string }> = [
  { value: 'tropical', label: 'Fruity & tropical' },
  { value: 'fresh-herbs', label: 'Fresh & herbal' },
  { value: 'bright-citrus', label: 'Bright & citrusy' },
];

const AVOID: Array<{ value: IngredientToAvoid; label: string }> = [
  { value: 'none', label: 'No ingredient preference' },
  { value: 'ginger', label: 'Skip ginger' },
  { value: 'pineapple', label: 'Skip pineapple' },
  { value: 'sea-moss', label: 'Skip sea moss' },
];

export default function FlavorFinder({ lemonades }: Props) {
  const [direction, setDirection] = useState<FlavorDirection>('tropical');
  const [avoid, setAvoid] = useState<IngredientToAvoid>('none');
  const recommendations = findMarketFlavors(lemonades, direction, avoid);

  return (
    <section aria-labelledby="flavor-finder-title" className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Your first sip starts here</p>
      <h2 id="flavor-finder-title" className="mt-2 text-2xl font-bold text-stone-950">Find a flavor to ask about.</h2>
      <p className="mt-2 text-sm leading-6 text-stone-700">
        Two quick choices. No signup needed. These suggestions come from our listed ingredients, not a live stock check.
      </p>

      <div className="mt-5 grid gap-5">
        <fieldset>
          <legend className="text-base font-semibold text-stone-950">1. What sounds good?</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {DIRECTIONS.map(({ value, label }) => (
              <label key={value} className={`inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${direction === value ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-stone-300 bg-white text-stone-900 hover:border-emerald-600'}`}>
                <input
                  type="radio"
                  name="market-flavor-direction"
                  value={value}
                  checked={direction === value}
                  onChange={() => setDirection(value)}
                  className="accent-emerald-900"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-base font-semibold text-stone-950">2. Any ingredients you want to skip?</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {AVOID.map(({ value, label }) => (
              <label key={value} className={`inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${avoid === value ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-stone-300 bg-white text-stone-900 hover:border-emerald-600'}`}>
                <input
                  type="radio"
                  name="market-ingredient-exclusion"
                  value={value}
                  checked={avoid === value}
                  onChange={() => setAvoid(value)}
                  className="accent-emerald-900"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="mt-6 border-t border-stone-200 pt-5" aria-live="polite" aria-atomic="true">
        <h3 className="text-lg font-semibold text-stone-950">A few flavors to explore</h3>
        {recommendations.length ? (
          <ul className="mt-3 grid gap-3">
            {recommendations.map((item) => (
              <li key={item.slug} className="rounded-xl border border-stone-200 bg-[#faf8f2] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="font-semibold text-stone-950">{item.name}</span>
                  <span className="font-bold tabular-nums text-emerald-800">${(item.approvedPriceCents / 100).toFixed(2)}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-700">{item.ingredients.join(' · ')}</p>
                <a href={`#flavor-${item.slug}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-800 underline underline-offset-4">
                  See the full menu listing
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm leading-6 text-stone-700">
            Nothing in our listed bottles fits both choices. Ask our team about today's prepared drinks and specials.
          </p>
        )}
        <p className="mt-4 text-xs leading-5 text-stone-600">
          Please check all ingredients, allergies, and shared preparation equipment with our team. Filtering a listed ingredient does not guarantee allergy safety.
          Availability and in-person purchase are confirmed at the booth; this is not an order or reservation.
        </p>
      </div>
    </section>
  );
}
