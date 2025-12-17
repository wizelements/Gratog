const DEBUG = process.env.DEBUG === "true" || process.env.VERBOSE === "true";
const debug = (...args) => { if (DEBUG) debug(...args); };

/**
 * Monitoring and alerting utilities
 */

interface MonitoringEvent {
  type: 'csp_violation' | 'csrf_rejection' | 'transaction_failure' | 'retry_exhausted' | 'security_alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metadata?: any;
  timestamp: Date;
}

/**
 * Log a security event
 */
export function logSecurityEvent(
  type: MonitoringEvent['type'],
  severity: MonitoringEvent['severity'],
  message: string,
  metadata?: any
) {
  const event: MonitoringEvent = {
    type,
    severity,
    message,
    metadata,
    timestamp: new Date(),
  };

  // Console logging (structured)
  debug(JSON.stringify({
    event: 'SECURITY_EVENT',
    ...event,
  }));

  // Send to external monitoring service (if configured)
  sendToMonitoring(event);

  // Alert on critical issues
  if (severity === 'critical') {
    alertCriticalIssue(event);
  }
}

/**
 * Log CSP violation
 */
export function logCspViolation(violationReport: any) {
  logSecurityEvent(
    'csp_violation',
    'high',
    'Content Security Policy violation detected',
    {
      documentUri: violationReport['document-uri'],
      violatedDirective: violationReport['violated-directive'],
      blockedUri: violationReport['blocked-uri'],
      sourceFile: violationReport['source-file'],
      lineNumber: violationReport['line-number'],
    }
  );
}

/**
 * Log CSRF rejection
 */
export function logCsrfRejection(request: {
  method: string;
  path: string;
  origin: string | null;
  host: string | null;
}) {
  logSecurityEvent(
    'csrf_rejection',
    'high',
    'CSRF validation failed - potential attack',
    {
      method: request.method,
      path: request.path,
      origin: request.origin,
      host: request.host,
      timestamp: new Date().toISOString(),
    }
  );
}

/**
 * Log transaction failure
 */
export function logTransactionFailure(error: Error, context: any) {
  logSecurityEvent(
    'transaction_failure',
    'high',
    'Database transaction failed',
    {
      error: error.message,
      stack: error.stack,
      context,
    }
  );
}

/**
 * Log retry exhaustion
 */
export function logRetryExhausted(
  operation: string,
  attempts: number,
  lastError: Error
) {
  logSecurityEvent(
    'retry_exhausted',
    'medium',
    `Retry attempts exhausted for ${operation}`,
    {
      operation,
      attempts,
      lastError: lastError.message,
      stack: lastError.stack,
    }
  );
}

/**
 * Send event to external monitoring service
 */
function sendToMonitoring(event: MonitoringEvent) {
  // PostHog tracking
  if (typeof window !== 'undefined' && 'posthog' in window) {
    const posthog = window.posthog as { capture: (event: string, properties: Record<string, unknown>) => void };
    posthog.capture('security_event', {
      ...event,
      $set: { last_security_event: event.type },
    });
  }

  // Sentry (if configured)
  const globalWithSentry = global as typeof globalThis & { Sentry?: { captureMessage: (message: string, options: Record<string, unknown>) => void } };
  if (process.env.SENTRY_DSN && globalWithSentry.Sentry) {
    globalWithSentry.Sentry.captureMessage(event.message, {
      level: event.severity === 'critical' ? 'error' : 'warning',
      tags: {
        event_type: event.type,
        severity: event.severity,
      },
      extra: event.metadata,
    });
  }

  // Custom webhook (if configured)
  const webhookUrl = process.env.MONITORING_WEBHOOK_URL;
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch((error) => {
      console.error('Failed to send monitoring event:', error);
    });
  }
}

/**
 * Alert on critical issues (email, SMS, Slack, etc.)
 */
function alertCriticalIssue(event: MonitoringEvent) {
  console.error('🚨 CRITICAL SECURITY ALERT:', event);

  // Send to Slack (if configured)
  const slackWebhook = process.env.SLACK_ALERT_WEBHOOK;
  if (slackWebhook) {
    fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 Critical Security Alert: ${event.message}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Critical Security Alert*\n*Type:* ${event.type}\n*Message:* ${event.message}\n*Time:* ${event.timestamp.toISOString()}`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `\`\`\`${JSON.stringify(event.metadata, null, 2)}\`\`\``,
            },
          },
        ],
      }),
    }).catch((error) => {
      console.error('Failed to send Slack alert:', error);
    });
  }

  // Send email alert (if configured)
  const alertEmail = process.env.ALERT_EMAIL;
  if (alertEmail) {
    // Use your email service here
    debug(`Would send alert email to: ${alertEmail}`);
  }
}

/**
 * Performance metric tracking
 */
export function trackPerformance(
  operation: string,
  durationMs: number,
  success: boolean,
  metadata?: any
) {
  debug(JSON.stringify({
    event: 'PERFORMANCE_METRIC',
    operation,
    durationMs,
    success,
    metadata,
    timestamp: new Date().toISOString(),
  }));

  // Send to PostHog
  if (typeof window !== 'undefined' && 'posthog' in window) {
    const posthog = window.posthog as { capture: (event: string, properties: Record<string, unknown>) => void };
    posthog.capture('performance_metric', {
      operation,
      duration_ms: durationMs,
      success,
      ...metadata,
    });
  }
}

/**
 * Middleware performance wrapper
 */
export async function withPerformanceTracking<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let success = false;

  try {
    const result = await fn();
    success = true;
    return result;
  } finally {
    const durationMs = Date.now() - startTime;
    trackPerformance(operation, durationMs, success);

    // Alert on slow operations
    if (durationMs > 5000) {
      logSecurityEvent(
        'security_alert',
        'medium',
        `Slow operation detected: ${operation}`,
        { durationMs }
      );
    }
  }
}
