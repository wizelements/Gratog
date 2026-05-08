'use client';

import { Suspense } from 'react';

interface ClientPageWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Wrapper for client pages that use useSearchParams or other client-only hooks
 * This prevents prerender errors by wrapping in Suspense
 */
export function ClientPageWrapper({ children, fallback }: ClientPageWrapperProps) {
  return (
    <Suspense fallback={fallback || <ClientPageFallback />}>
      {children}
    </Suspense>
  );
}

function ClientPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
    </div>
  );
}
