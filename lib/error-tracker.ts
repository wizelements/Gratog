/**
 * Unified Error Tracking System
 * 
 * Captures detailed context whenever "Something went wrong" errors occur,
 * builds comprehensive error summaries for investigation, and enables rapid
 * root cause identification.
 */

import { logger } from '@/lib/logger';

interface ErrorContext {
  // Error details
  message: string;
  code?: string;
  stack?: string;
  
  // Source information
  source: 'client' | 'server' | 'middleware' | 'api' | 'hydration' | 'unknown';
  component?: string;
  endpoint?: string;
  
  // Request context
  method?: string;
  url?: string;
  pathname?: string;
  userAgent?: string;
  headers?: Record<string, string>;
  
  // System state
  memory?: {
    used: number;
    total: number;
    percentage: number;
  };
  timestamp: string;
  
  // User context
  userId?: string;
  sessionId?: string;
  
  // Additional metadata
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  metadata?: Record<string, any>;
}

interface ErrorSummary {
  id: string;
  timestamp: string;
  errorCount: number;
  firstOccurrence: string;
  lastOccurrence: string;
  sources: Set<string>;
  categories: Set<string>;
  patterns: ErrorPattern[];
  topErrors: Array<{ message: string; count: number }>;
  timeline: ErrorTimelineEntry[];
  correlations: ErrorCorrelation[];
  recommendations: string[];
}

interface ErrorPattern {
  pattern: string;
  frequency: number;
  lastSeen: string;
  examples: string[];
}

interface ErrorTimelineEntry {
  timestamp: string;
  message: string;
  source: string;
  count: number;
}

interface ErrorCorrelation {
  error1: string;
  error2: string;
  frequency: number;
  timeWindow: number; // milliseconds
}

// In-memory error store (limited to last 1000 errors)
const errorStore = new Map<string, ErrorContext>();
const MAX_ERRORS_STORED = 1000;
const errorList: ErrorContext[] = [];

/**
 * Capture error with full context
 */
export async function captureError(error: Error | string, context: Partial<ErrorContext>): Promise<string> {
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const errorContext: ErrorContext = {
    message: typeof error === 'string' ? error : error.message,
    stack: error instanceof Error ? error.stack : undefined,
    source: context.source || 'unknown',
    severity: context.severity || 'high',
    category: context.category || 'unspecified',
    timestamp: new Date().toISOString(),
    ...context,
  };

  // Store error
  errorStore.set(errorId, errorContext);
  errorList.push(errorContext);

  // Maintain size limit
  if (errorList.length > MAX_ERRORS_STORED) {
    const removed = errorList.shift();
    if (removed) {
      // Find and delete the oldest error
      let oldestId = '';
      let oldestTime = Infinity;
      for (const [id, ctx] of errorStore.entries()) {
        const time = new Date(ctx.timestamp).getTime();
        if (time < oldestTime) {
          oldestTime = time;
          oldestId = id;
        }
      }
      if (oldestId) {
        errorStore.delete(oldestId);
      }
    }
  }

  // Log to system
  const errorLogger = logger.withCategory('ERROR');
  errorLogger.error(`[${errorId}] ${errorContext.message}`, {
    source: errorContext.source,
    component: errorContext.component,
    endpoint: errorContext.endpoint,
    severity: errorContext.severity,
    category: errorContext.category,
  });

  // Send to monitoring (if configured)
  await sendToMonitoring(errorId, errorContext);

  return errorId;
}

/**
 * Capture error with automatic context detection (client-side)
 */
export async function captureClientError(error: Error | string, componentName?: string): Promise<string> {
  const context: Partial<ErrorContext> = {
    source: 'client',
    component: componentName,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    pathname: typeof window !== 'undefined' ? window.location.pathname : undefined,
  };

  return captureError(error, context);
}

/**
 * Capture error with automatic context detection (server-side)
 */
export async function captureServerError(
  error: Error | string,
  request?: Request,
  endpoint?: string
): Promise<string> {
  const headers: Record<string, string> = {};
  if (request && request.headers) {
    headers['user-agent'] = request.headers.get('user-agent') || '';
    headers['referer'] = request.headers.get('referer') || '';
    headers['accept'] = request.headers.get('accept') || '';
  }

  // Get memory usage if available
  let memory: ErrorContext['memory'] = undefined;
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    const totalMB = 48; // Vercel default
    const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
    memory = {
      used: usedMB,
      total: totalMB,
      percentage: Math.round((usedMB / totalMB) * 100),
    };
  }

  const context: Partial<ErrorContext> = {
    source: 'server',
    endpoint,
    method: request?.method,
    headers,
    memory,
    url: request?.url,
    pathname: request ? new URL(request.url).pathname : undefined,
  };

  return captureError(error, context);
}

/**
 * Capture hydration error
 */
export async function captureHydrationError(error: Error | string, details?: Record<string, any>): Promise<string> {
  const context: Partial<ErrorContext> = {
    source: 'hydration',
    category: 'React Hydration Mismatch',
    severity: 'critical',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    metadata: details,
  };

  return captureError(error, context);
}

/**
 * Capture API error
 */
export async function captureApiError(
  error: Error | string,
  endpoint: string,
  request?: Request,
  statusCode?: number,
  responseBody?: any
): Promise<string> {
  const context: Partial<ErrorContext> = {
    source: 'api',
    endpoint,
    method: request?.method,
    category: 'API Error',
    metadata: {
      statusCode,
      responseBody: typeof responseBody === 'string' ? responseBody.substring(0, 500) : responseBody,
    },
  };

  return captureError(error, context);
}

/**
 * Generate comprehensive error summary from stored errors
 */
export function generateErrorSummary(): ErrorSummary {
  const now = new Date();
  const summaryId = `summary_${Date.now()}`;
  const errors = Array.from(errorStore.values());

  if (errors.length === 0) {
    return {
      id: summaryId,
      timestamp: now.toISOString(),
      errorCount: 0,
      firstOccurrence: '',
      lastOccurrence: '',
      sources: new Set(),
      categories: new Set(),
      patterns: [],
      topErrors: [],
      timeline: [],
      correlations: [],
      recommendations: [],
    };
  }

  // Analyze errors
  const sources = new Set(errors.map(e => e.source));
  const categories = new Set(errors.map(e => e.category));
  
  const messageFrequency = new Map<string, number>();
  errors.forEach(e => {
    messageFrequency.set(e.message, (messageFrequency.get(e.message) || 0) + 1);
  });

  const topErrors = Array.from(messageFrequency.entries())
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Detect patterns
  const patterns = detectErrorPatterns(errors);

  // Build timeline
  const timeline = buildErrorTimeline(errors);

  // Find correlations
  const correlations = findErrorCorrelations(errors);

  // Generate recommendations
  const recommendations = generateRecommendations(errors, patterns);

  const sortedErrors = errors.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return {
    id: summaryId,
    timestamp: now.toISOString(),
    errorCount: errors.length,
    firstOccurrence: sortedErrors[0]?.timestamp || '',
    lastOccurrence: sortedErrors[sortedErrors.length - 1]?.timestamp || '',
    sources,
    categories,
    patterns,
    topErrors,
    timeline,
    correlations,
    recommendations,
  };
}

/**
 * Detect recurring error patterns
 */
function detectErrorPatterns(errors: ErrorContext[]): ErrorPattern[] {
  const patterns = new Map<string, { count: number; lastSeen: string; examples: string[] }>();

  errors.forEach(error => {
    // Extract pattern from error message (first 50 chars as pattern)
    const pattern = error.message.substring(0, 50);
    const existing = patterns.get(pattern) || { count: 0, lastSeen: '', examples: [] };

    existing.count++;
    existing.lastSeen = error.timestamp;
    if (existing.examples.length < 3) {
      existing.examples.push(error.message);
    }

    patterns.set(pattern, existing);
  });

  return Array.from(patterns.entries())
    .filter(([_, data]) => data.count > 1)
    .map(([pattern, data]) => ({
      pattern,
      frequency: data.count,
      lastSeen: data.lastSeen,
      examples: data.examples,
    }))
    .sort((a, b) => b.frequency - a.frequency);
}

/**
 * Build error timeline
 */
function buildErrorTimeline(errors: ErrorContext[]): ErrorTimelineEntry[] {
  const timeline = new Map<string, { source: string; count: number }>();

  errors.forEach(error => {
    const bucket = error.timestamp.substring(0, 16); // Group by minute
    const existing = timeline.get(bucket) || { source: error.source, count: 0 };
    existing.count++;
    timeline.set(bucket, existing);
  });

  return Array.from(timeline.entries())
    .map(([timestamp, data]) => ({
      timestamp: timestamp + ':00Z',
      message: `${data.count} error(s) from ${data.source}`,
      source: data.source,
      count: data.count,
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/**
 * Find correlated errors (errors that often occur together)
 */
function findErrorCorrelations(errors: ErrorContext[]): ErrorCorrelation[] {
  const correlations: ErrorCorrelation[] = [];
  const timeWindow = 60000; // 1 minute

  for (let i = 0; i < errors.length; i++) {
    for (let j = i + 1; j < errors.length; j++) {
      const timeDiff = Math.abs(
        new Date(errors[i].timestamp).getTime() - 
        new Date(errors[j].timestamp).getTime()
      );

      if (timeDiff < timeWindow) {
        const existing = correlations.find(
          c => 
            (c.error1 === errors[i].message && c.error2 === errors[j].message) ||
            (c.error1 === errors[j].message && c.error2 === errors[i].message)
        );

        if (existing) {
          existing.frequency++;
        } else {
          correlations.push({
            error1: errors[i].message.substring(0, 100),
            error2: errors[j].message.substring(0, 100),
            frequency: 1,
            timeWindow,
          });
        }
      }
    }
  }

  return correlations
    .filter(c => c.frequency > 1)
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);
}

/**
 * Generate actionable recommendations based on error analysis
 */
function generateRecommendations(errors: ErrorContext[], patterns: ErrorPattern[]): string[] {
  const recommendations: string[] = [];
  const categories = new Set(errors.map(e => e.category));

  if (categories.has('React Hydration Mismatch')) {
    recommendations.push(
      '🔧 Hydration Error Detected: Check server/client render mismatch in components (ThemeProvider, localStorage access, dates, etc.)',
      '🔍 Verify no {typeof window} checks without proper guards',
      '⚠️ Check for useEffect that runs on server (missing useEffect hook)',
    );
  }

  if (categories.has('Memory')) {
    recommendations.push(
      '💾 Memory Usage Critical: Check in-memory cache sizes and implement eviction policies',
      '🔄 Review unbounded Maps/Sets - add MAX_SIZE limits',
      '🎯 Implement LRU cache patterns to prevent memory leaks',
    );
  }

  if (categories.has('API Error')) {
    recommendations.push(
      '🌐 API Error Detected: Check endpoint availability and error responses',
      '🔐 Verify authentication headers and API keys',
      '📋 Check request body format and validation',
    );
  }

  const criticalErrors = errors.filter(e => e.severity === 'critical');
  if (criticalErrors.length > 0) {
    recommendations.push(
      `🚨 ${criticalErrors.length} Critical Errors Found: Immediate investigation required`,
    );
  }

  const memoryErrors = errors.filter(e => e.memory && e.memory.percentage > 80);
  if (memoryErrors.length > 0) {
    recommendations.push(
      `💾 High Memory Usage Detected (${Math.max(...memoryErrors.map(e => e.memory?.percentage || 0))}%): Review unbounded caches`,
    );
  }

  if (patterns.length > 0) {
    recommendations.push(
      `🔁 ${patterns[0].frequency} Occurrences of "${patterns[0].pattern}..." - Review root cause`,
    );
  }

  return recommendations;
}

/**
 * Send error to external monitoring service
 */
async function sendToMonitoring(errorId: string, context: ErrorContext): Promise<void> {
  // This can be extended to send to Sentry, DataDog, etc.
  const monitoringUrl = process.env.ERROR_MONITORING_URL;
  
  if (!monitoringUrl) {
    return; // Skip if not configured
  }

  try {
    await fetch(monitoringUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        errorId,
        ...context,
      }),
    });
  } catch (error) {
    // Don't throw - monitoring shouldn't break the app
    console.error('Failed to send error to monitoring service:', error);
  }
}

/**
 * Get all stored errors
 */
export function getStoredErrors(): ErrorContext[] {
  return Array.from(errorStore.values());
}

/**
 * Clear error store
 */
export function clearErrorStore(): void {
  errorStore.clear();
  errorList.length = 0;
}

/**
 * Get error by ID
 */
export function getError(errorId: string): ErrorContext | undefined {
  return errorStore.get(errorId);
}

export default {
  captureError,
  captureClientError,
  captureServerError,
  captureHydrationError,
  captureApiError,
  generateErrorSummary,
  getStoredErrors,
  clearErrorStore,
  getError,
};
