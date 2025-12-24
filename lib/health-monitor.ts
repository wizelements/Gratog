/**
 * Automated Health Monitoring System
 * 
 * Continuously monitors system health WITHOUT waiting for errors.
 * Proactively detects and reports issues to the error tracking system.
 */

import { captureServerError } from '@/lib/error-tracker';
import { createLogger } from '@/lib/logger';

const logger = createLogger('HealthMonitor');

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    server: boolean;
    database: boolean;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  errors?: string[];
}

interface HealthAlert {
  severity: 'critical' | 'high' | 'medium';
  message: string;
  metric: string;
  value: any;
  threshold?: any;
  timestamp: string;
}

// Store alert history to avoid spam
const alertHistory = new Map<string, { timestamp: number; count: number }>();
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ALERTS_PER_KEY = 3; // Max 3 alerts within cooldown period

/**
 * Check if we should send alert (avoid spam)
 */
function shouldSendAlert(key: string): boolean {
  const now = Date.now();
  const existing = alertHistory.get(key);

  if (!existing) {
    alertHistory.set(key, { timestamp: now, count: 1 });
    return true;
  }

  const timeSinceLastAlert = now - existing.timestamp;

  // If cooldown expired, reset
  if (timeSinceLastAlert > ALERT_COOLDOWN_MS) {
    alertHistory.set(key, { timestamp: now, count: 1 });
    return true;
  }

  // If within cooldown and under limit, allow
  if (existing.count < MAX_ALERTS_PER_KEY) {
    existing.count++;
    return true;
  }

  return false;
}

/**
 * Perform health check (mirrors /api/health but for internal use)
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const errors: string[] = [];

  // Check database
  let databaseHealthy = false;
  try {
    const { connectToDatabase } = await import('@/lib/db-optimized');
    const { db } = await connectToDatabase();
    await db.command({ ping: 1 });
    databaseHealthy = true;
  } catch (error) {
    errors.push(`Database: ${error instanceof Error ? error.message : 'Connection failed'}`);
  }

  // Check memory
  const memoryUsage = process.memoryUsage();
  const totalMemory = memoryUsage.heapTotal;
  const usedMemory = memoryUsage.heapUsed;
  const memoryPercentage = Math.round((usedMemory / totalMemory) * 100);

  if (memoryPercentage > 90) {
    errors.push(`Critical memory usage: ${memoryPercentage}%`);
  } else if (memoryPercentage > 80) {
    errors.push(`High memory usage: ${memoryPercentage}%`);
  }

  let status: HealthCheckResult['status'] = 'healthy';
  if (!databaseHealthy) {
    status = 'degraded';
  }
  if (memoryPercentage > 90) {
    status = 'unhealthy';
  } else if (memoryPercentage > 80 || !databaseHealthy) {
    status = 'degraded';
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    checks: {
      server: true,
      database: databaseHealthy,
      memory: {
        used: Math.round(usedMemory / 1024 / 1024),
        total: Math.round(totalMemory / 1024 / 1024),
        percentage: memoryPercentage,
      },
    },
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Monitor health and automatically report issues
 */
export async function monitorHealth(): Promise<void> {
  try {
    const health = await performHealthCheck();

    if (health.status !== 'healthy') {
      const alertKey = `health_${health.status}`;

      if (shouldSendAlert(alertKey)) {
        const message =
          health.status === 'unhealthy'
            ? `System is UNHEALTHY: ${health.errors?.join('; ') || 'Unknown issue'}`
            : `System is DEGRADED: ${health.errors?.join('; ') || 'Unknown issue'}`;

        // Capture as error (will be available in error summary)
        await captureServerError(new Error(message), undefined, '/health-monitor');

        // Log alert
        if (health.status === 'unhealthy') {
          logger.error(`Health check failed: ${health.status}`, health.errors?.join('; '));
        } else {
          logger.warn(`Health check degraded: ${health.status}`, health.errors?.join('; '));
        }
      }
    }
  } catch (error) {
    // Even if monitoring fails, don't throw - just log
    logger.error('Health monitoring failed', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Start continuous health monitoring (for long-running processes)
 * WARNING: Do NOT use in serverless - use cron job instead
 */
let monitoringInterval: NodeJS.Timeout | null = null;

export function startHealthMonitoring(intervalMs: number = 60000): void {
  if (typeof process === 'undefined' || !process.env.NODE_ENV) {
    logger.warn('startHealthMonitoring: Not in Node.js environment, skipping');
    return;
  }

  if (monitoringInterval) {
    logger.warn('Health monitoring already started');
    return;
  }

  logger.info(`Starting health monitoring with ${intervalMs}ms interval`);

  monitoringInterval = setInterval(async () => {
    await monitorHealth();
  }, intervalMs);

  // Don't keep process alive
  monitoringInterval.unref?.();
}

export function stopHealthMonitoring(): void {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    logger.warn('Health monitoring stopped');
  }
}

export default {
  performHealthCheck,
  monitorHealth,
  startHealthMonitoring,
  stopHealthMonitoring,
};
