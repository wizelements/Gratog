'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ExploreLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/explore" className="flex min-w-0 items-center gap-3 hover:opacity-80 transition-opacity">
              <span className="text-2xl">🌿</span>
              <div>
                <span className="block text-lg font-semibold text-gray-900 sm:text-xl">Ingredients & Learning</span>
                <p className="text-sm text-gray-500">Explore what goes into our products</p>
              </div>
            </Link>

            <Link href="/" className="shrink-0">
              <Button variant="outline" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Back to Site
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
