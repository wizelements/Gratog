'use client';

import React from 'react';

/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and displays a fallback UI
 * instead of crashing the whole page with "Something went wrong"
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    // Report to error tracking service if available
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, { extra: errorInfo });
    }
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI or nothing (silent fail)
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Silent mode - render nothing instead of error
      if (this.props.silent) {
        return null;
      }
      
      // Default minimal fallback
      return (
        <div className="p-4 text-center text-gray-500 text-sm">
          {this.props.message || 'Unable to load this section'}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Safe Component Wrapper
 * Wraps a component with error boundary for graceful degradation
 */
export function SafeComponent({ children, fallback = null, silent = false }) {
  return (
    <ErrorBoundary fallback={fallback} silent={silent}>
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
