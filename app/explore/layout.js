'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ExploreLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/explore" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <span className="text-2xl">🌿</span>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Ingredients & Learning</h1>
                <p className="text-sm text-gray-500">Explore what goes into our products</p>
              </div>
            </Link>

            <Link href="/">
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
