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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch('/api/menus/current');
        const data = await res.json();
        if (data.success && data.menu) {
          setMenu(data.menu);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, []);

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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-50 dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8 space-y-2">
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
            href={menu.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-sm font-medium"
          >
            🔍 Open Full Size
          </a>
          <a
            href="/catalog"
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium"
          >
            🛒 Shop This Menu
          </a>
        </div>

        {/* Menu Image — pinch-to-zoom on mobile */}
        <div className="rounded-2xl overflow-hidden shadow-xl bg-white dark:bg-gray-800 border border-emerald-100 dark:border-emerald-900/30">
          <img
            src={menu.imageUrl}
            alt={menu.title}
            className="w-full h-auto"
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
      </div>
    </div>
  );
}
