'use client';

import { useEffect } from 'react';
import { captureClientError } from '@/lib/error-tracker';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Application error:', error);
    
    // Capture error with tracking system
    if (error) {
      captureClientError(
        error instanceof Error ? error : new Error(String(error)),
        'ErrorBoundary'
      ).catch(err => console.error('Failed to capture error:', err));
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-16 w-16 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-6">
          We encountered an error while loading this page. Please try again.
        </p>
        <button
          onClick={() => reset()}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          Try again
        </button>
        <button
          onClick={() => (window.location.href = '/')}
          className="w-full mt-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          Go home
        </button>
      </div>
    </div>
  );
}
