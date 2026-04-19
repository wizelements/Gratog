'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * LEGACY CHECKOUT REDIRECT
 * 🎯 CONVERSION PSYCHOLOGY: Single entry point reduces decision paralysis
 * Redirects to modern checkout to ensure consistent experience
 */
export default function OrderPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to modern checkout with query params preserved
    router.push('/checkout');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to checkout...</p>
      </div>
    </div>
  );
}
