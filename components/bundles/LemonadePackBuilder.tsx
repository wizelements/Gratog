'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Minus, Plus, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { addLemonadePackToCart } from '@/lib/cart-engine';
import { isApprovedLemonadeLine, LEMONADE_PACKS } from '@/lib/lemonade-packs';

type LemonadeProduct = {
  id: string; name: string; slug?: string; price: number; stock?: number;
  isPreorder?: boolean; preorderOnly?: boolean; image?: string;
  variations?: Array<{ id: string; name?: string; price?: number; priceCents?: number }>;
};
export default function LemonadePackBuilder({ products, initialSize = 4 }: { products: LemonadeProduct[]; initialSize?: 4 | 6 }) {
  const [size, setSize] = useState<4 | 6>(initialSize);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const pack = LEMONADE_PACKS.find((p) => p.size === size)!;
  const count = Object.values(counts).reduce((n, value) => n + value, 0);
  const distinctFlavors = Object.values(counts).filter((value) => value > 0).length;
  const variations = useMemo(() => products.map((product) => ({
    product,
    variation: product.variations?.find((v) => isApprovedLemonadeLine({
      ...product, unitPriceCents: Math.round(Number(v.price ?? product.price) * 100),
      subtitle: v.name,
    })),
  })).filter((entry) => Boolean(entry.variation)), [products]);
  const changeCount = (id: string, delta: number) => {
    setCounts((current) => {
      const old = current[id] || 0;
      const next = Math.max(0, Math.min(size - (count - old), old + delta));
      return { ...current, [id]: next };
    });
  };
  const switchSize = (next: 4 | 6) => {
    setSize(next);
    setCounts({});
  };
  const addPack = () => {
    if (count !== size || distinctFlavors < 2 || busy) return;
    setBusy(true);
    const selections = variations.filter(({ product }) => (counts[product.id] || 0) > 0)
      .map(({ product, variation }) => ({ product, variation, quantity: counts[product.id] }));
    const result = addLemonadePackToCart(selections, size);
    setBusy(false);
    if (!result.success) {
      toast.error(result.error || 'Could not add your pack.');
      return;
    }
    toast.success(`${size}-pack added. Your savings appear in checkout.`, {
      action: { label: 'View cart', onClick: () => window.dispatchEvent(new Event('openCart')) },
    });
    setCounts({});
  };

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-stone-950">
      <section className="bg-emerald-950 text-white">
        <div className="container max-w-6xl py-12 sm:py-16">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-200">Mix and match • Lemonades only</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">Choose your lemonade pack.</h1>
          <p className="mt-4 max-w-2xl text-lg text-emerald-50/90">Four or six 16 oz lemonades. Choose at least two different flavors. You can repeat flavors within a mixed pack. Juices, shots and sea moss gels are not included in these deals.</p>
        </div>
      </section>
      <div className="container max-w-6xl py-10 sm:py-14">
        <div role="group" aria-label="Choose pack size" className="grid gap-4 sm:grid-cols-2">
          {LEMONADE_PACKS.map((option) => (
            <button key={option.size} type="button" onClick={() => switchSize(option.size as 4 | 6)}
              aria-pressed={size === option.size}
              className={`min-h-40 rounded-3xl border-2 p-6 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 ${size === option.size ? 'border-emerald-700 bg-emerald-50 shadow-lg' : 'border-stone-200 bg-white hover:border-emerald-400'}`}>
              <span className="flex items-center justify-between gap-2">
                <span className="text-2xl font-bold">{option.size}-Pack</span>
                {size === option.size && <Check aria-hidden="true" className="h-6 w-6 text-emerald-800" />}
              </span>
              <span className="mt-4 block text-3xl font-bold text-emerald-900">${(option.priceCents / 100).toFixed(2)}</span>
              <span className="mt-2 block text-sm text-stone-600"><s>${(option.regularCents / 100).toFixed(2)}</s> · Save ${(option.savingsCents / 100).toFixed(2)} before fulfillment fees</span>
            </button>
          ))}
        </div>
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
          <section aria-labelledby="flavor-heading">
            <h2 id="flavor-heading" className="text-2xl font-semibold">Pick {size} bottles</h2>
            <p className="mt-2 text-stone-600">Choose at least two different flavors per pack. Each bottle counts toward your four or six; only currently orderable 16 oz lemonades appear here.</p>
            {variations.length === 0 ? (
              <div role="status" className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-6">
                <p className="font-semibold">Packs are not available for online checkout yet.</p>
                <p className="mt-2 text-sm">We are verifying the live lemonade catalog and available quantities. No payment will be taken for unavailable flavors.</p>
                <Link href="/catalog" className="mt-3 inline-flex min-h-11 items-center font-semibold text-emerald-800 underline">Browse individual drinks</Link>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {variations.map(({ product }) => {
                  const qty = counts[product.id] || 0;
                  return (
                    <div key={product.id} className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5">
                      <div><h3 className="text-lg font-semibold">{product.name}</h3><p className="mt-1 text-sm text-stone-600">16 oz · ${Number(product.price).toFixed(2)} individually</p>
                        {(product.isPreorder || product.preorderOnly) && <p className="mt-2 text-xs font-medium text-amber-800">Preorder · market pickup restrictions may apply</p>}
                      </div>
                      <div className="mt-5 flex items-center justify-between gap-3" aria-label={`Bottles of ${product.name}`}>
                        <button type="button" disabled={qty === 0} onClick={() => changeCount(product.id, -1)} aria-label={`Remove one ${product.name}`}
                          className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-300 disabled:opacity-30"><Minus className="h-5 w-5" /></button>
                        <span aria-live="polite" className="text-xl font-bold tabular-nums">{qty}</span>
                        <button type="button" disabled={count >= size} onClick={() => changeCount(product.id, 1)} aria-label={`Add one ${product.name}`}
                          className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-800 text-white disabled:opacity-30"><Plus className="h-5 w-5" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          <aside className="lg:sticky lg:top-24">
            <div className="rounded-3xl border border-emerald-900/10 bg-white p-6 shadow-md">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Your {size}-pack</p>
              <p className="mt-3 text-3xl font-bold tabular-nums">{count} / {size} bottles</p>
              <div role="progressbar" aria-label="Pack filled" aria-valuemin={0} aria-valuemax={size} aria-valuenow={count}
                className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200">
                <div className="h-full rounded-full bg-emerald-700 transition-all" style={{ width: `${(count / size) * 100}%` }} />
              </div>
              <div className="mt-5 flex justify-between text-sm"><span>Pack price</span><strong>${(pack.priceCents / 100).toFixed(2)}</strong></div>
              <p className="mt-2 text-sm font-semibold text-emerald-800">You save ${(pack.savingsCents / 100).toFixed(2)} vs. singles</p>
              <Button type="button" disabled={count !== size || distinctFlavors < 2 || busy || variations.length < 2} onClick={addPack}
                className="mt-6 h-12 w-full rounded-full bg-emerald-800 text-white hover:bg-emerald-900">
                <ShoppingBag className="mr-2 h-5 w-5" /> {count === size && distinctFlavors < 2 ? 'Choose another flavor' : count === size ? 'Add pack to cart' : `Choose ${size - count} more`}
              </Button>
              <Link href="/checkout" className="mt-4 inline-flex min-h-11 w-full items-center justify-center font-semibold text-emerald-800">Review checkout <ArrowRight className="ml-2 h-4 w-4" /></Link>
              <p className="mt-3 text-xs leading-5 text-stone-600">Savings apply automatically to qualifying bottles in your cart. No promo code. Coupons do not stack. Availability, fulfillment fees and pickup or delivery options are confirmed at checkout.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
