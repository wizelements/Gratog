'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { BUNDLES } from '@/data/bundles';
import { track } from '@/utils/analytics';

interface BundleSuggestionsProps {
  cartTotal: number;
  cartCategoryCounts?: Record<string, number>;
  marketId?: string | null;
  context?: 'items' | 'checkout';
}
export default function BundleSuggestions({ context = 'items', marketId }: BundleSuggestionsProps) {
  return (
    <aside className="mx-4 mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Lemonade savings</p>
      <h3 className="mt-1 text-lg font-semibold">4-packs and 6-packs</h3>
      <p className="mt-1 text-sm text-stone-700">Mix and match eligible 16 oz lemonades. No juices, shots or gels.</p>
      <Link href="/lemonade-packs"
        onClick={() => track('bundle_suggestion_click', { bundleId: 'lemonade-packs', context, marketId: marketId || null })}
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-800 px-5 text-sm font-semibold text-white hover:bg-emerald-900">
        <ShoppingBag className="h-4 w-4" aria-hidden="true" /> Shop lemonade packs
      </Link>
    </aside>
  );
}
export function getAllBundleOptions() { return BUNDLES; }
