'use client';

/**
 * Isolated visual and selection preview. No payment, inventory reservation,
 * or minimum-bypass is wired here. Do not link from customer navigation or
 * publish as a live offer before Square checkout / webhook tests certify it.
 */
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Leaf, Loader2, ShieldCheck } from 'lucide-react';
import {
  LEMONADE_BUNDLE_OFFERS, listAvailableLemonadeBundleChoices,
  quoteLemonadeBundle, type CatalogLemonadeCandidate, type LemonadeBundleSize,
} from '@/lib/preorder/lemonade-bundle-offers';

export default function LemonadeBundlePreviewPage() {
  const [size, setSize] = useState<LemonadeBundleSize>(4);
  const [selected, setSelected] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<CatalogLemonadeCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch('/api/storefront/catalog', {
          cache: 'no-store', headers: { Accept: 'application/json' }, signal: controller.signal,
        });
        if (!response.ok) throw new Error('Catalog unavailable');
        const json = await response.json();
        if (!Array.isArray(json.products)) throw new Error('Catalog unavailable');
        if (!controller.signal.aborted) setCatalog(json.products);
      } catch {
        if (!controller.signal.aborted) setCatalogError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const choices = useMemo(() => listAvailableLemonadeBundleChoices(catalog), [catalog]);
  const offer = LEMONADE_BUNDLE_OFFERS[size];
  const quote = useMemo(
    () => quoteLemonadeBundle(size, selected, catalog), [size, selected, catalog],
  );
  const remaining = Math.max(0, size - selected.length);
  const enoughFlavors = choices.length >= size;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id)
        : current.length < size ? [...current, id] : current,
    );
  }

  return (
    <main className="min-h-screen bg-[#faf8f3] px-4 py-10 text-[#29342c] sm:py-14">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 rounded-xl border border-[#dccda9] bg-[#f7f0e1] px-4 py-3 text-sm leading-6 text-[#675638]" role="status">
          <strong>Design preview — not available for purchase.</strong> This page does not place an order, reserve inventory, or take payment.
        </div>
        <header className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#d3dccb] bg-[#eef2e9] px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#3b6349]">
            <Leaf aria-hidden="true" className="h-4 w-4" /> Taste of Gratitude · Small-batch collection
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#263b2d] sm:text-5xl">
            Your favorites. <span className="font-normal italic text-[#97703b]">Better together.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#62685e] sm:text-lg">
            More of what you love, for a little less. Choose a collection of handcrafted 16 oz lemonades — each bottle a different flavor.
          </p>
        </header>

        <div className="mt-10 grid gap-4 sm:grid-cols-2" aria-label="Choose a collection size">
          {([4, 6] as const).map((option) => {
            const p = LEMONADE_BUNDLE_OFFERS[option];
            const active = size === option;
            return (
              <button key={option} type="button" aria-pressed={active}
                onClick={() => { setSize(option); setSelected([]); }}
                className={`min-h-[225px] rounded-3xl border-2 p-6 text-left shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c754c] ${active ? 'border-[#385e44] bg-[#f1f5ef]' : 'border-[#e1dfd5] bg-white hover:border-[#a2b6a5]'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5b755e]">
                      {option === 4 ? 'An everyday collection' : 'More to enjoy or share'}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-[#263b2d]">
                      Gracious {option === 4 ? 'Four' : 'Six'}
                    </h2>
                    <p className="mt-1 text-sm text-[#62685e]">{option} different 16 oz lemonades</p>
                  </div>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${active ? 'border-[#385e44] bg-[#385e44] text-white' : 'border-[#a6b6a7] bg-white'}`}>
                    {active && <Check aria-hidden="true" className="h-4 w-4" />}
                  </span>
                </div>
                <div className="mt-5 flex flex-wrap items-end gap-3">
                  <span className="text-4xl font-semibold tracking-tight text-[#263b2d]">
                    ${(p.priceCents / 100).toFixed(0)}
                  </span>
                  <span className="mb-1 text-base text-[#898c85] line-through">
                    ${(p.regularTotalCents / 100).toFixed(2)}
                  </span>
                </div>
                <span className="mt-3 inline-flex rounded-full bg-[#e4eee1] px-3 py-1.5 text-sm font-semibold text-[#335e41]">
                  Save ${(p.savingsCents / 100).toFixed(2)}
                </span>
                <p className="mt-3 text-sm text-[#62685e]">${(p.unitPriceCents / 100).toFixed(2)} per bottle</p>
              </button>
            );
          })}
        </div>

        <section className="mt-8 overflow-hidden rounded-3xl border border-[#e6e3d9] bg-white shadow-sm" aria-labelledby="flavor-heading">
          <div className="border-b border-[#e6e3d9] bg-[#f5f5ee] px-5 py-6 sm:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7b65]">Made yours</p>
                <h2 id="flavor-heading" className="mt-1 text-2xl font-semibold text-[#263b2d]">
                  Choose your {size} flavors
                </h2>
                <p className="mt-2 text-sm text-[#62685e]">No repeats. Just your favorites from the current menu.</p>
              </div>
              <div className="shrink-0 sm:text-right" aria-live="polite">
                <p className="text-2xl font-semibold text-[#355f41]">{selected.length} of {size}</p>
                <p className="text-xs text-[#62685e]">
                  {remaining === 0 ? 'Your collection is selected' : `${remaining} more to choose`}
                </p>
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#d9e0d6]"
              role="progressbar" aria-label="Flavors selected" aria-valuemin={0}
              aria-valuemax={size} aria-valuenow={selected.length}>
              <div className="h-full rounded-full bg-[#39684a] transition-[width]"
                style={{ width: `${selected.length / size * 100}%` }} />
            </div>
          </div>
          <div className="px-5 py-6 sm:px-8">
            {loading && (
              <p className="flex items-center gap-2 text-[#62685e]">
                <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> Checking the current menu…
              </p>
            )}
            {!loading && (catalogError || choices.length === 0) && (
              <p role="alert" className="rounded-xl bg-[#f7f2e8] p-4 text-sm leading-6 text-[#6a573b]">
                Eligible flavors cannot be confirmed right now. Bundles cannot be reserved until the menu is verified.
              </p>
            )}
            {!loading && !catalogError && choices.length > 0 && (
              <>
                {!enoughFlavors && (
                  <p role="status" className="mb-5 rounded-xl bg-[#f7f2e8] p-4 text-sm text-[#6a573b]">
                    Only {choices.length} distinct eligible flavors are available on this menu. This {size}-pack cannot be completed.
                  </p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {choices.map((choice) => {
                    const checked = selected.includes(choice.id);
                    const disabled = !checked && selected.length >= size;
                    return (
                      <button type="button" key={choice.id} aria-pressed={checked}
                        disabled={disabled} onClick={() => toggle(choice.id)}
                        className={`flex min-h-[64px] items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#385e44] disabled:cursor-not-allowed disabled:opacity-45 ${checked ? 'border-[#446b50] bg-[#eff3ea]' : 'border-[#dddcd3] hover:border-[#9fb2a1]'}`}>
                        <span className="font-medium text-[#2d3b31]">{choice.name}</span>
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${checked ? 'border-[#385e44] bg-[#385e44] text-white' : 'border-[#aab9ab]'}`}>
                          {checked && <Check aria-hidden="true" className="h-4 w-4" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <div className="mt-7 rounded-2xl border border-[#e5e3da] bg-[#fcfbf7] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-[#62685e]">Your {size}-bottle collection</p>
                  <p className="mt-1 text-3xl font-semibold text-[#263b2d]">${(offer.priceCents / 100).toFixed(2)}</p>
                  <p className="mt-1 text-sm text-[#456e4b]">Save ${(offer.savingsCents / 100).toFixed(2)} vs. individual bottles</p>
                </div>
                <span className="inline-flex items-center gap-2 text-sm text-[#4c6152]">
                  <ShieldCheck aria-hidden="true" className="h-5 w-5" /> No charge in this preview
                </span>
              </div>
              <button type="button" disabled title="Preview only — checkout is disabled"
                className="mt-5 flex min-h-[52px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[#aab9aa] px-5 py-3 font-semibold text-white">
                {quote.valid ? 'Your selection is complete — checkout not yet enabled'
                  : `Choose ${remaining} more ${remaining === 1 ? 'flavor' : 'flavors'}`}
                {quote.valid && <ArrowRight aria-hidden="true" className="h-5 w-5" />}
              </button>
              <p className="mt-3 text-center text-xs leading-5 text-[#6e716a]">
                Market pickup by confirmed preorder only; not same-day. Secure payment follows checkout verification.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
