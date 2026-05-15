/**
 * Web Vitals Analytics API
 * Receives and stores Core Web Vitals metrics
 * 
 * @edge - Lightweight endpoint for fast ingestion
 */

export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

interface WebVitalsPayload {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  id: string;
  navigationType: string;
  timestamp: number;
  url: string;
}

// Thresholds based on Google's Core Web Vitals
const THRESHOLDS: Record<string, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 },        // Largest Contentful Paint (ms)
  FID: { good: 100, poor: 300 },          // First Input Delay (ms)
  CLS: { good: 0.1, poor: 0.25 },         // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 },         // First Contentful Paint (ms)
  TTFB: { good: 800, poor: 1800 },        // Time to First Byte (ms)
  INP: { good: 200, poor: 500 },           // Interaction to Next Paint (ms)
};

function validateMetric(payload: unknown): payload is WebVitalsPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  
  const p = payload as WebVitalsPayload;
  return (
    typeof p.name === 'string' &&
    typeof p.value === 'number' &&
    typeof p.rating === 'string' &&
    typeof p.id === 'string'
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!validateMetric(body)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { name, value, rating, id, navigationType, timestamp, url } = body;

    // Log poor metrics for immediate attention
    if (rating === 'poor') {
      console.warn(`[WebVitals] Poor ${name}: ${value}`, {
        id,
        url: url?.split('?')[0], // Strip query params for privacy
        navigationType,
      });
    }

    // In production, send to your analytics platform:
    // - Vercel Analytics (automatic with @vercel/analytics)
    // - Datadog
    // - New Relic
    // - Custom ClickHouse/Postgres
    
    // Example: Send to Datadog
    // await sendToDatadog({ name, value, rating, id });

    // Example: Send to Vercel Analytics via HTTP if not using auto-instrumentation
    // await fetch('https://vitals.vercel-analytics.com/v1/vitals', {
    //   method: 'POST',
    //   headers: { 'x-vercel-analytics': 'true' },
    //   body: JSON.stringify({ ... }),
    // });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[WebVitals API] Error:', error);
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
  }
}

// Get aggregated stats (admin only)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  // Simple admin check - replace with proper auth
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    message: 'Analytics dashboard coming soon',
    // In production, return aggregated metrics from your database
  });
}
