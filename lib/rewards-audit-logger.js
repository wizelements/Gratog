/**
 * Audit Logger for Rewards System
 * 
 * Provides:
 * - Structured logging with correlation IDs
 * - PII-safe logging (hashed emails, masked names)
 * - Event categorization (security, activity, error, performance)
 * - Metrics collection for monitoring
 */

import { connectToDatabase } from './db-optimized';
import { createHash, randomUUID } from 'crypto';

// Log levels
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  SECURITY: 'security'
};

// Event categories
export const EventCategory = {
  AUTH: 'authentication',
  STAMP: 'stamp',
  VOUCHER: 'voucher',
  PASSPORT: 'passport',
  FRAUD: 'fraud',
  RATE_LIMIT: 'rate_limit',
  ERROR: 'error',
  PERFORMANCE: 'performance'
};

// In-memory metrics (would use Prometheus/StatsD in production)
const metrics = {
  stamps: { total: 0, success: 0, failed: 0 },
  vouchers: { issued: 0, redeemed: 0, expired: 0 },
  auth: { success: 0, failed: 0 },
  errors: { total: 0, byType: {} },
  latency: { samples: [], p95: 0, p99: 0, avg: 0 }
};

export class AuditLogger {
  static correlationId = null;

  /**
   * Set correlation ID for request tracing
   */
  static setCorrelationId(id = null) {
    this.correlationId = id || randomUUID();
    return this.correlationId;
  }

  /**
   * Get current correlation ID
   */
  static getCorrelationId() {
    return this.correlationId || randomUUID();
  }

  /**
   * Hash email for privacy-safe logging
   */
  static hashEmail(email) {
    if (!email) return 'unknown';
    return createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 12);
  }

  /**
   * Mask name for privacy-safe logging
   */
  static maskName(name) {
    if (!name) return null;
    return name.charAt(0) + '*'.repeat(Math.min(name.length - 1, 5));
  }

  /**
   * Log an event
   */
  static async log(level, category, event, data = {}) {
    const logEntry = {
      id: randomUUID(),
      correlationId: this.getCorrelationId(),
      level,
      category,
      event,
      data: this.sanitizeData(data),
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development'
    };

    // Console log for development
    if (process.env.NODE_ENV !== 'production') {
      const logFn = level === LogLevel.ERROR ? console.error : 
                    level === LogLevel.WARN ? console.warn : 
                    console.log;
      logFn(`[${level.toUpperCase()}] [${category}] ${event}`, logEntry.data);
    }

    // Store in database for audit trail
    try {
      const { db } = await connectToDatabase();
      await db.collection('audit_logs').insertOne(logEntry);
    } catch (error) {
      console.error('Failed to store audit log:', error.message);
    }

    // Update metrics
    this.updateMetrics(category, event, level);

    return logEntry;
  }

  /**
   * Sanitize data for logging (remove PII)
   */
  static sanitizeData(data) {
    const sanitized = { ...data };

    // Hash emails
    if (sanitized.email) {
      sanitized.emailHash = this.hashEmail(sanitized.email);
      delete sanitized.email;
    }
    if (sanitized.customerEmail) {
      sanitized.customerEmailHash = this.hashEmail(sanitized.customerEmail);
      delete sanitized.customerEmail;
    }

    // Mask names
    if (sanitized.name) {
      sanitized.name = this.maskName(sanitized.name);
    }
    if (sanitized.customerName) {
      sanitized.customerName = this.maskName(sanitized.customerName);
    }

    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    delete sanitized.apiKey;

    return sanitized;
  }

  /**
   * Update metrics counters
   */
  static updateMetrics(category, event, level) {
    switch (category) {
      case EventCategory.STAMP:
        metrics.stamps.total++;
        if (event.includes('success') || event.includes('created')) {
          metrics.stamps.success++;
        } else if (event.includes('failed') || event.includes('error')) {
          metrics.stamps.failed++;
        }
        break;

      case EventCategory.VOUCHER:
        if (event.includes('issued') || event.includes('awarded')) {
          metrics.vouchers.issued++;
        } else if (event.includes('redeemed')) {
          metrics.vouchers.redeemed++;
        }
        break;

      case EventCategory.AUTH:
        if (event.includes('success')) {
          metrics.auth.success++;
        } else if (event.includes('failed')) {
          metrics.auth.failed++;
        }
        break;

      case EventCategory.ERROR:
        metrics.errors.total++;
        const errorType = event.split('_')[0];
        metrics.errors.byType[errorType] = (metrics.errors.byType[errorType] || 0) + 1;
        break;
    }
  }

  /**
   * Record latency sample
   */
  static recordLatency(durationMs) {
    metrics.latency.samples.push(durationMs);
    
    // Keep only last 1000 samples
    if (metrics.latency.samples.length > 1000) {
      metrics.latency.samples = metrics.latency.samples.slice(-1000);
    }

    // Calculate percentiles
    const sorted = [...metrics.latency.samples].sort((a, b) => a - b);
    const len = sorted.length;
    
    metrics.latency.avg = Math.round(sorted.reduce((a, b) => a + b, 0) / len);
    metrics.latency.p95 = sorted[Math.floor(len * 0.95)] || 0;
    metrics.latency.p99 = sorted[Math.floor(len * 0.99)] || 0;
  }

  /**
   * Get current metrics
   */
  static getMetrics() {
    return { ...metrics };
  }

  // =========================================================================
  // Convenience logging methods
  // =========================================================================

  static async logStampCreated(email, marketName, xpValue) {
    return this.log(LogLevel.INFO, EventCategory.STAMP, 'stamp_created', {
      email,
      marketName,
      xpValue
    });
  }

  static async logStampFailed(email, marketName, reason) {
    return this.log(LogLevel.WARN, EventCategory.STAMP, 'stamp_failed', {
      email,
      marketName,
      reason
    });
  }

  static async logVoucherIssued(email, voucherType, voucherCode) {
    return this.log(LogLevel.INFO, EventCategory.VOUCHER, 'voucher_issued', {
      email,
      voucherType,
      voucherCodePrefix: voucherCode?.substring(0, 8) + '***'
    });
  }

  static async logVoucherRedeemed(email, voucherId) {
    return this.log(LogLevel.INFO, EventCategory.VOUCHER, 'voucher_redeemed', {
      email,
      voucherId
    });
  }

  static async logPassportCreated(email) {
    return this.log(LogLevel.INFO, EventCategory.PASSPORT, 'passport_created', {
      email
    });
  }

  static async logAuthSuccess(email, source = 'api') {
    return this.log(LogLevel.INFO, EventCategory.AUTH, 'auth_success', {
      email,
      source
    });
  }

  static async logAuthFailed(email, reason) {
    return this.log(LogLevel.SECURITY, EventCategory.AUTH, 'auth_failed', {
      email,
      reason
    });
  }

  static async logFraudDetected(email, score, reasons, action) {
    return this.log(LogLevel.SECURITY, EventCategory.FRAUD, 'fraud_detected', {
      email,
      score,
      reasons,
      action
    });
  }

  static async logRateLimitHit(email, endpoint, limit) {
    return this.log(LogLevel.WARN, EventCategory.RATE_LIMIT, 'rate_limit_hit', {
      email,
      endpoint,
      limit
    });
  }

  static async logError(error, context = {}) {
    return this.log(LogLevel.ERROR, EventCategory.ERROR, `error_${error.name || 'unknown'}`, {
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      ...context
    });
  }

  /**
   * Query audit logs
   */
  static async queryLogs(filters = {}, options = {}) {
    try {
      const { db } = await connectToDatabase();
      
      const query = {};
      
      if (filters.category) query.category = filters.category;
      if (filters.level) query.level = filters.level;
      if (filters.event) query.event = { $regex: filters.event, $options: 'i' };
      if (filters.correlationId) query.correlationId = filters.correlationId;
      if (filters.since) query.timestamp = { $gte: filters.since };
      if (filters.until) {
        query.timestamp = query.timestamp || {};
        query.timestamp.$lte = filters.until;
      }

      const limit = Math.min(options.limit || 100, 1000);
      const skip = options.offset || 0;

      const logs = await db.collection('audit_logs')
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await db.collection('audit_logs').countDocuments(query);

      return {
        logs,
        total,
        limit,
        offset: skip
      };
    } catch (error) {
      console.error('Failed to query audit logs:', error);
      return { logs: [], total: 0, error: error.message };
    }
  }

  /**
   * Initialize audit log indexes
   */
  static async initializeIndexes() {
    try {
      const { db } = await connectToDatabase();

      // Index for querying by time
      await db.collection('audit_logs').createIndex({ timestamp: -1 });

      // Index for filtering by category/level
      await db.collection('audit_logs').createIndex({ category: 1, level: 1, timestamp: -1 });

      // Index for correlation ID tracing
      await db.collection('audit_logs').createIndex({ correlationId: 1 });

      // TTL index for automatic cleanup (90 days)
      await db.collection('audit_logs').createIndex(
        { timestamp: 1 },
        { expireAfterSeconds: 90 * 24 * 60 * 60 }
      );

      console.log('Audit log indexes initialized');
    } catch (error) {
      console.error('Failed to initialize audit log indexes:', error);
    }
  }
}

export default AuditLogger;
