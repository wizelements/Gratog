'use client';

import { useEffect } from 'react';
import { captureClientError } from '@/lib/error-tracker';

/**
 * Global Error Boundary
 * Catches errors in the root layout and renders a fallback UI
 * This is critical for Vercel deployments to show something instead of "Application Error"
 */
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    if (error) {
      captureClientError(
        error instanceof Error ? error : new Error(String(error)),
        'GlobalError'
      ).catch(err => console.error('Failed to capture global error:', err));
    }
  }, [error]);
  return (
    <html lang="en">
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
          padding: '1rem',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '28rem',
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <svg
                style={{ margin: '0 auto', height: '4rem', width: '4rem', color: '#ef4444' }}
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
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
              Something went wrong
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              We're sorry, but something unexpected happened. Our team has been notified.
            </p>
            <button
              onClick={() => reset()}
              style={{
                width: '100%',
                backgroundColor: '#16a34a',
                color: 'white',
                fontWeight: '600',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '0.75rem'
              }}
            >
              Try again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                width: '100%',
                backgroundColor: '#e5e7eb',
                color: '#374151',
                fontWeight: '600',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Go to Homepage
            </button>
            {process.env.NODE_ENV === 'development' && error && (
              <pre style={{
                marginTop: '1rem',
                padding: '0.5rem',
                backgroundColor: '#fef2f2',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                textAlign: 'left',
                overflow: 'auto',
                maxHeight: '10rem'
              }}>
                {error.message}
                {'\n'}
                {error.stack}
              </pre>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
