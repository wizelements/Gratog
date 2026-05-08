'use client';

import { Suspense } from 'react';

interface SearchParamsProviderProps {
  children: React.ReactNode;
}

/**
 * Wrapper for components that use useSearchParams
 * This prevents prerender errors by wrapping in Suspense
 */
export function SearchParamsProvider({ children }: SearchParamsProviderProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    }>
      {children}
    </Suspense>
  );
}
