'use client';

import { useEffect, useState } from 'react';
import { captureClientError } from '@/lib/error-tracker';

export default function Error({ error, reset }) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reported, setReported] = useState(false);

  const errorDetails = {
    message: error?.message || String(error),
    stack: error?.stack || 'No stack trace',
    name: error?.name || 'Error',
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    timestamp: new Date().toISOString(),
    digest: error?.digest || null,
  };

  useEffect(() => {
    console.error('Application error:', error);
    
    // Capture error with tracking system
    if (error) {
      captureClientError(
        error instanceof Error ? error : new Error(String(error)),
        'ErrorBoundary'
      ).catch(err => console.error('Failed to capture error:', err));

      // Also report to our API
      fetch('/api/error-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorDetails),
      }).then(() => setReported(true)).catch(() => {});
    }
  }, [error]);

  const copyErrorDetails = () => {
    const text = `ERROR REPORT
====================
Message: ${errorDetails.message}
Name: ${errorDetails.name}
Digest: ${errorDetails.digest}
URL: ${errorDetails.url}
Time: ${errorDetails.timestamp}
User Agent: ${errorDetails.userAgent}

Stack Trace:
${errorDetails.stack}`;
    
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">We'll be right back</h2>
        <p className="text-gray-600 mb-4">
          This page is temporarily unavailable. Please try again.
        </p>
        
        {reported && (
          <p className="text-sm text-green-600 mb-4">✓ Error automatically reported</p>
        )}

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
        
        <div className="mt-6 pt-4 border-t">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            {showDetails ? 'Hide' : 'Show'} error details
          </button>
          
          {showDetails && (
            <div className="mt-4 text-left">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs font-mono overflow-auto max-h-48">
                <p><strong>Error:</strong> {errorDetails.message}</p>
                <p><strong>Name:</strong> {errorDetails.name}</p>
                {errorDetails.digest && <p><strong>Digest:</strong> {errorDetails.digest}</p>}
                <p className="mt-2"><strong>Stack:</strong></p>
                <pre className="whitespace-pre-wrap text-red-700">{errorDetails.stack}</pre>
              </div>
              
              <button
                onClick={copyErrorDetails}
                className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                {copied ? '✓ Copied to clipboard!' : '📋 Copy error details'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
