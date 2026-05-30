'use client';

import { useEffect } from 'react';
import { useReportWebVitals } from 'next/web-vitals';

interface WebVitalMetric {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  entries: PerformanceEntry[];
  navigationType: string;
}

/**
 * Web Vitals Monitoring Component
 * Tracks Core Web Vitals and sends to analytics
 * 
 * Metrics tracked:
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay) 
 * - CLS (Cumulative Layout Shift)
 * - FCP (First Contentful Paint)
 * - TTFB (Time to First Byte)
 * - INP (Interaction to Next Paint) - Next.js 15+
 */
export function WebVitalsReporter() {
  useReportWebVitals((metric: WebVitalMetric) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[WebVitals] ${metric.name}:`, {
        value: Math.round(metric.value * 100) / 100,
        rating: metric.rating,
        id: metric.id,
      });
    }

    // Send to analytics endpoint
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      navigationType: metric.navigationType,
      timestamp: Date.now(),
      url: window.location.href,
    });

    // Use sendBeacon if available for reliability
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/web-vitals', body);
    } else {
      fetch('/api/analytics/web-vitals', {
        method: 'POST',
        body,
        keepalive: true,
      }).catch(() => {}); // Silent fail
    }
  });

  return null;
}

/**
 * Performance Observer for custom metrics
 */
export function PerformanceObserverComponent() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Observe Long Animation Frames (Next.js 15 / React 19)
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // Log long tasks for debugging
            if (entry.duration > 50) {
              console.warn('[Performance] Long task detected:', {
                duration: entry.duration,
                startTime: entry.startTime,
              });
            }
          }
        });

        observer.observe({ entryTypes: ['longtask'] });

        return () => observer.disconnect();
      } catch (e) {
        // Long tasks not supported
      }
    }
    return undefined;
  }, []);

  return null;
}

/**
 * Combined analytics component
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WebVitalsReporter />
      <PerformanceObserverComponent />
      {children}
    </>
  );
}
