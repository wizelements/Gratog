/**
 * Critical Operations Handler
 * 
 * Paranoid reliability patterns for payment-critical operations.
 * NEVER silently fail - always alert, retry, or provide fallback.
 */

import { logger } from '@/lib/logger';
import { captureError } from '@/lib/error-tracker';
import * as Sentry from '@sentry/nextjs';

const log = logger.withCategory('CriticalOps');

// Retry configuration
const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

interface RetryConfig {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

interface QueuedOperation {
  id: string;
  type: 'email' | 'sms' | 'notification' | 'db_persist';
  payload: any;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: Date;
  nextRetryAt: Date;
}

// In-memory queue for immediate retries (supplement with DB queue)
const retryQueue: QueuedOperation[] = [];
const MAX_QUEUE_SIZE = 100;

/**
 * Execute operation with exponential backoff retry
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  config: RetryConfig = {}
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs, backoffMultiplier } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxAttempts) {
        log.error(`${operationName} failed after ${maxAttempts} attempts`, {
          error: lastError.message,
          attempts: attempt,
        });
        break;
      }
      
      const delay = Math.min(
        baseDelayMs * Math.pow(backoffMultiplier, attempt - 1),
        maxDelayMs
      );
      
      log.warn(`${operationName} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms`, {
        error: lastError.message,
      });
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Queue operation for later retry if immediate execution fails
 */
export function queueForRetry(
  type: QueuedOperation['type'],
  payload: any,
  maxAttempts: number = 5
): string {
  const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Enforce queue size limit
  if (retryQueue.length >= MAX_QUEUE_SIZE) {
    // Remove oldest entry
    retryQueue.shift();
    log.warn('Retry queue at capacity, evicting oldest entry');
  }
  
  const operation: QueuedOperation = {
    id,
    type,
    payload,
    attempts: 0,
    maxAttempts,
    createdAt: new Date(),
    nextRetryAt: new Date(Date.now() + 60000), // Retry in 1 minute
  };
  
  retryQueue.push(operation);
  log.info(`Queued ${type} operation for retry`, { id, payloadId: payload.orderId });
  
  return id;
}

/**
 * Get pending retry operations (for cron job processing)
 */
export function getPendingRetries(): QueuedOperation[] {
  const now = new Date();
  return retryQueue.filter(op => op.nextRetryAt <= now && op.attempts < op.maxAttempts);
}

/**
 * Mark retry as attempted
 */
export function markRetryAttempted(id: string, error?: string): void {
  const op = retryQueue.find(o => o.id === id);
  if (op) {
    op.attempts++;
    op.lastError = error;
    // Exponential backoff for next retry
    const nextDelay = Math.min(60000 * Math.pow(2, op.attempts), 3600000); // Max 1 hour
    op.nextRetryAt = new Date(Date.now() + nextDelay);
  }
}

/**
 * Remove completed retry from queue
 */
export function removeRetry(id: string): void {
  const index = retryQueue.findIndex(o => o.id === id);
  if (index >= 0) {
    retryQueue.splice(index, 1);
  }
}

/**
 * Critical alert for payment/order failures
 */
export async function criticalAlert(
  category: string,
  message: string,
  context: Record<string, any>
): Promise<void> {
  // Always log
  log.error(`[CRITICAL] ${category}: ${message}`, context);
  
  // Capture in Sentry with highest priority
  Sentry.captureMessage(`[CRITICAL] ${category}: ${message}`, {
    level: 'fatal',
    tags: {
      category,
      critical: 'true',
    },
    extra: context,
  });
  
  // Capture in error tracker
  await captureError(new Error(`${category}: ${message}`), {
    severity: 'critical',
    category,
    metadata: context,
  });
  
  // TODO: Add PagerDuty/Slack webhook for immediate alerting
  const alertWebhook = process.env.CRITICAL_ALERT_WEBHOOK;
  if (alertWebhook) {
    try {
      await fetch(alertWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 CRITICAL: ${category}`,
          blocks: [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: `*${message}*` },
            },
            {
              type: 'section',
              text: { type: 'mrkdwn', text: `\`\`\`${JSON.stringify(context, null, 2)}\`\`\`` },
            },
          ],
        }),
      });
    } catch (webhookError) {
      log.error('Failed to send critical alert webhook', { webhookError });
    }
  }
}

/**
 * Safe JSON stringify that handles BigInt
 */
export function safeStringify(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
}

/**
 * Persist critical data with fallback mechanisms
 */
export async function persistWithFallback(
  primaryPersist: () => Promise<void>,
  data: any,
  context: { type: string; id: string }
): Promise<{ success: boolean; primary: boolean; fallback: boolean }> {
  let primarySuccess = false;
  let fallbackSuccess = false;
  
  // Try primary persistence
  try {
    await primaryPersist();
    primarySuccess = true;
    return { success: true, primary: true, fallback: false };
  } catch (primaryError) {
    log.error('Primary persistence failed', {
      type: context.type,
      id: context.id,
      error: primaryError instanceof Error ? primaryError.message : String(primaryError),
    });
    
    // Alert immediately for payment data
    if (context.type === 'payment') {
      await criticalAlert('PaymentPersistence', 'Primary database write failed for payment', {
        paymentId: context.id,
        error: primaryError instanceof Error ? primaryError.message : String(primaryError),
        data: safeStringify(data),
      });
    }
  }
  
  // Try fallback persistence (webhook to backup service)
  const backupWebhook = process.env.BACKUP_PERSIST_WEBHOOK;
  if (backupWebhook) {
    try {
      const response = await fetch(backupWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeStringify({
          type: context.type,
          id: context.id,
          data,
          timestamp: new Date().toISOString(),
          source: 'fallback_persist',
        }),
      });
      
      if (response.ok) {
        fallbackSuccess = true;
        log.info('Fallback persistence succeeded', { type: context.type, id: context.id });
      }
    } catch (fallbackError) {
      log.error('Fallback persistence also failed', {
        type: context.type,
        id: context.id,
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      });
    }
  }
  
  // Last resort: queue for retry
  if (!primarySuccess && !fallbackSuccess) {
    queueForRetry('db_persist', { type: context.type, id: context.id, data });
  }
  
  return {
    success: primarySuccess || fallbackSuccess,
    primary: primarySuccess,
    fallback: fallbackSuccess,
  };
}

/**
 * Send notification with retry and queue fallback
 */
export async function sendNotificationReliably(
  type: 'email' | 'sms',
  sendFn: () => Promise<void>,
  payload: { orderId: string; recipient: string },
  options: { maxAttempts?: number } = {}
): Promise<{ success: boolean; queued: boolean }> {
  const maxAttempts = options.maxAttempts || 3;
  
  try {
    await withRetry(sendFn, `${type}_notification`, { maxAttempts });
    return { success: true, queued: false };
  } catch (error) {
    log.error(`${type} notification failed, queuing for retry`, {
      orderId: payload.orderId,
      recipient: payload.recipient,
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Queue for later retry
    queueForRetry(type, payload, 5);
    
    // Alert for critical notifications
    await criticalAlert('NotificationFailure', `${type} notification failed and queued`, {
      orderId: payload.orderId,
      recipient: payload.recipient,
      error: error instanceof Error ? error.message : String(error),
    });
    
    return { success: false, queued: true };
  }
}

/**
 * Wrap async operation with timeout
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const criticalOperations = {
  withRetry,
  withTimeout,
  queueForRetry,
  getPendingRetries,
  markRetryAttempted,
  removeRetry,
  criticalAlert,
  safeStringify,
  persistWithFallback,
  sendNotificationReliably,
};

export default criticalOperations;
