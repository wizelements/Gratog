'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { AdminMenu } from '@/lib/menus/types';

function formatDateRange(start: string, end: string): string {
  try {
    const s = new Date(start);
    const e = new Date(end);
    const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
    const yearOpts: Intl.DateTimeFormatOptions = { ...opts, year: 'numeric' };
    if (s.getFullYear() !== e.getFullYear()) {
      return `${s.toLocaleDateString('en-US', yearOpts)} – ${e.toLocaleDateString('en-US', yearOpts)}`;
    }
    return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', yearOpts)}`;
  } catch {
    return `${start} – ${end}`;
  }
}

export default function MenuPage() {
  const [menu, setMenu] = useState<AdminMenu | null>(null);
  const [menus, setMenus] = useState<AdminMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchMenu() {
      try {
        const [currentRes, archiveRes] = await Promise.all([
          fetch('/api/menus/current'),
          fetch('/api/menus'),
        ]);
        const currentData = await currentRes.json();
        const archiveData = await archiveRes.json();
        if (currentData.success && currentData.menu) {
          setMenu(currentData.menu);
        }
        if (archiveData.success && Array.isArray(archiveData.menus)) {
          setMenus(archiveData.menus);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, []);

  const archivedMenus = menus.filter((item) => item.id !== menu?.id);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-teal-50 dark:from-gray-950 dark:to-gray-900">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-teal-50 dark:from-gray-950 dark:to-gray-900 p-4">
        <div className="text-center max-w-md">
          <p className="text-gray-600 dark:text-gray-400">
            Unable to load menu. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-teal-50 dark:from-gray-950 dark:to-gray-900 p-4">
        <div className="text-center max-w-md space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            This Week&apos;s Printed Menu Is Being Prepared
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You can still shop the live catalog now. Preorders are typically prepared for Saturday market pickup,
            and the $60 preorder minimum is shown before payment.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/catalog"
              className="inline-block px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Browse Live Catalog
            </Link>
            <Link
              href="/markets"
              className="inline-block px-6 py-2.5 border border-emerald-600 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors font-medium"
            >
              View Pickup Markets
            </Link>
          </div>
          {menus.length > 0 && (
            <div className="mt-8 border-t border-emerald-900/10 pt-6 text-left">
              <h3 className="text-center text-lg font-semibold text-gray-900 dark:text-gray-100">Past market menus</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {menus.slice(0, 4).map((archived) => (
                  <a
                    key={archived.id}
                    href={archived.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-emerald-100 bg-white p-3 shadow-sm hover:border-emerald-300"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                      {formatDateRange(archived.weekStart, archived.weekEnd)}
                    </p>
                    <p className="mt-1 font-medium text-stone-950">{archived.title}</p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-stone-950">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8 space-y-2">
          <p className="inline-flex rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800 shadow-sm">
            Fresh market menu
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
            {menu.title}
          </h1>
          <p className="text-emerald-700 dark:text-emerald-400 font-medium">
            {formatDateRange(menu.weekStart, menu.weekEnd)}
          </p>
          {menu.description && (
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {menu.description}
            </p>
          )}
          {menu.seasonalTags && menu.seasonalTags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {menu.seasonalTags.map((tag) => (
                <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6 grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950 sm:grid-cols-3">
          <div>
            <p className="font-semibold">1. Browse this week</p>
            <p className="mt-1 text-emerald-800">Use the menu as your market preview.</p>
          </div>
          <div>
            <p className="font-semibold">2. Preorder online</p>
            <p className="mt-1 text-emerald-800">Shop live catalog items before checkout.</p>
          </div>
          <div>
            <p className="font-semibold">3. Pickup or ship</p>
            <p className="mt-1 text-emerald-800">Fulfillment details are confirmed before payment.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-4 flex flex-wrap justify-center gap-3 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-sm font-medium"
          >
            🖨️ Print Menu
          </button>
          <a
            href={menu.printUrl || menu.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-sm font-medium"
          >
            🔍 Open {menu.printUrl ? 'Printable File' : 'Full Size'}
          </a>
          <a
            href="/catalog"
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium"
          >
            🛒 Shop This Menu
          </a>
        </div>

        {/* Menu Image — pinch-to-zoom on mobile */}
        <div className="mx-auto max-w-3xl rounded-[1.5rem] overflow-hidden shadow-xl bg-white dark:bg-gray-800 border border-emerald-100 dark:border-emerald-900/30">
          <img
            src={menu.imageUrl}
            alt={menu.title}
            className="h-auto w-full object-contain"
            loading="eager"
            style={{ touchAction: 'pinch-zoom', maxWidth: '100%' }}
          />
        </div>

        {/* Linked Products */}
        {menu.linkedProducts && menu.linkedProducts.length > 0 && (
          <div className="mt-8 text-center">
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium shadow-md"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Order These Items
            </Link>
          </div>
        )}

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-emerald-700 dark:text-emerald-400 hover:underline text-sm"
          >
            ← Back to Home
          </Link>
        </div>

        {archivedMenus.length > 0 && (
          <section className="mt-12 border-t border-emerald-900/10 pt-8 print:hidden">
            <div className="mb-5 text-center">
              <h2 className="text-2xl font-semibold text-stone-950">Past market menus</h2>
              <p className="mt-2 text-sm text-stone-600">Archive previous seasonal menus and market drops.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {archivedMenus.slice(0, 6).map((archived) => (
                <article key={archived.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                  <a href={archived.imageUrl} target="_blank" rel="noreferrer" className="block aspect-[4/5] bg-stone-100">
                    <img src={archived.thumbnailUrl || archived.imageUrl} alt={archived.title} loading="lazy" className="h-full w-full object-cover" />
                  </a>
                  <div className="space-y-2 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                      {formatDateRange(archived.weekStart, archived.weekEnd)}
                    </p>
                    <h3 className="font-semibold text-stone-950">{archived.title}</h3>
                    {archived.description && <p className="line-clamp-2 text-sm text-stone-600">{archived.description}</p>}
                    <div className="flex flex-wrap gap-2 pt-1 text-xs">
                      <a href={archived.imageUrl} target="_blank" rel="noreferrer" className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-800">Open menu</a>
                      {archived.printUrl && <a href={archived.printUrl} target="_blank" rel="noreferrer" className="rounded-full bg-stone-100 px-3 py-1 font-medium text-stone-700">Print</a>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
