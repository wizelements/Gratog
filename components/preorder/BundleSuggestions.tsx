'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Plus, Sparkles, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BUNDLES, getFeaturedBundles } from '@/data/bundles';
import { track } from '@/utils/analytics';

interface BundleSuggestionsProps {
  cartTotal: number;
  cartCategoryCounts?: Record<string, number>;
  marketId?: string | null;
  context?: 'items' | 'checkout';
}

function getBestBundleMatch(cartTotal: number, categoryCounts: Record<string, number> = {}) {
  // Prefer featured bundles; surface one that helps cross a minimum gap or complements cart.
  const featured = getFeaturedBundles();
  if (cartTotal < 45) return featured.find((b) => b.id === 'starter-box') || featured[0] || null;
  if (!categoryCounts.gels) return featured.find((b) => b.productsIncluded.some((id) => id.includes('gel'))) || featured[0] || null;
  if (!categoryCounts.shots) return featured.find((b) => b.productsIncluded.some((id) => id.includes('defense') || id.includes('shot'))) || featured[0] || null;
  return featured.find((b) => b.id === 'weekly-wellness-box') || featured[0] || null;
}

export default function BundleSuggestions({ cartTotal, cartCategoryCounts = {}, marketId, context = 'items' }: BundleSuggestionsProps) {
  const bundle = useMemo(() => getBestBundleMatch(cartTotal, cartCategoryCounts), [cartTotal, cartCategoryCounts]);

  if (!bundle) return null;

  const href = `/preorder?bundle=${encodeURIComponent(bundle.slug)}&market=${encodeURIComponent(marketId || '')}&utm_source=preorder_bundle&utm_campaign=passive_preorder_funnel`;

  return (
    <div className="mx-4 mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Bundle suggestion</p>
          <h3 className="mt-1 text-base font-semibold text-stone-950">{bundle.name}</h3>
          <p className="mt-1 text-sm leading-6 text-stone-600">{bundle.description}</p>
          <p className="mt-2 text-xs text-amber-800">
            <span className="rounded-md bg-amber-100 px-2 py-1 font-medium">{bundle.savingsText}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" className="rounded-full bg-emerald-700 text-white hover:bg-emerald-800">
              <Link
                href={href}
                onClick={() => track('bundle_suggestion_click', { bundleId: bundle.id, context, marketId: marketId || null })}
              >
                <ShoppingBag className="mr-1 h-4 w-4" aria-hidden="true" />
                Build this box
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-100">
              <Link href="/weekly-menu?utm_source=preorder_bundle&utm_campaign=passive_preorder_funnel">
                View weekly menu
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function getAllBundleOptions() {
  return BUNDLES;
}
