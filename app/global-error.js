'use client';

import { useEffect, useState } from 'react';
import { captureClientError } from '@/lib/error-tracker';

/**
 * Global Error Boundary
 * Catches errors in the root layout and renders a fallback UI
 * This is critical for Vercel deployments to show something instead of "Application Error"
 */
export default function GlobalError({ error, reset }) {
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
    source: 'GlobalError',
  };

  useEffect(() => {
    if (error) {
      captureClientError(
        error instanceof Error ? error : new Error(String(error)),
        'GlobalError'
      ).catch(err => console.error('Failed to capture global error:', err));

      // Report to our API
      fetch('/api/error-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorDetails),
      }).then(() => setReported(true)).catch(() => {});
    }
  }, [error]);

  const copyErrorDetails = () => {
    const text = `GLOBAL ERROR REPORT
====================
Message: ${errorDetails.message}
Name: ${errorDetails.name}
Digest: ${errorDetails.digest}
URL: ${errorDetails.url}
Time: ${errorDetails.timestamp}
User Agent: ${errorDetails.userAgent}

Stack Trace:
${errorDetails.stack}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
    }
  };

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
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              We're sorry, but something unexpected happened.
            </p>
            
            {reported && (
              <p style={{ fontSize: '0.875rem', color: '#16a34a', marginBottom: '1rem' }}>
                ✓ Error automatically reported
              </p>
            )}

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
            
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
              <button
                onClick={() => setShowDetails(!showDetails)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {showDetails ? 'Hide' : 'Show'} error details
              </button>
              
              {showDetails && (
                <div style={{ marginTop: '1rem', textAlign: 'left' }}>
                  <div style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    overflow: 'auto',
                    maxHeight: '12rem'
                  }}>
                    <p><strong>Error:</strong> {errorDetails.message}</p>
                    <p><strong>Name:</strong> {errorDetails.name}</p>
                    {errorDetails.digest && <p><strong>Digest:</strong> {errorDetails.digest}</p>}
                    <p style={{ marginTop: '0.5rem' }}><strong>Stack:</strong></p>
                    <pre style={{ whiteSpace: 'pre-wrap', color: '#b91c1c', margin: 0 }}>
                      {errorDetails.stack}
                    </pre>
                  </div>
                  
                  <button
                    onClick={copyErrorDetails}
                    style={{
                      marginTop: '0.75rem',
                      width: '100%',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      fontWeight: '600',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    {copied ? '✓ Copied to clipboard!' : '📋 Copy error details'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
