'use client';

import { useEffect } from 'react';

export default function AdminError({ error, reset }) {
  useEffect(() => {
    console.error('Admin error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-xl font-bold text-red-600 mb-4">Admin Error</h2>
        <p className="text-gray-700 mb-6">
          An error occurred in the admin panel. Please try again or contact support.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => reset()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
          >
            Try again
          </button>
          <button
            onClick={() => (window.location.href = '/admin')}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
