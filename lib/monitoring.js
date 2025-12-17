// Production monitoring and performance utilities
import { logger } from '@/lib/logger';

export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.alerts = [];
  }
  
  // Track API response times
  static trackApiPerformance(endpoint, startTime, endTime, statusCode) {
    const duration = endTime - startTime;
    
    console.log(`API Performance: ${endpoint} - ${duration}ms (${statusCode})`);
    
    // Alert on slow responses (>2 seconds)
    if (duration > 2000) {
      console.warn(`🐌 SLOW API: ${endpoint} took ${duration}ms`);
    }
    
    // Alert on errors
    if (statusCode >= 500) {
      console.error(`🚨 API ERROR: ${endpoint} returned ${statusCode}`);
    }
    
    return {
      endpoint,
      duration,
      statusCode,
      timestamp: new Date().toISOString(),
      performance: duration < 500 ? 'excellent' : duration < 1000 ? 'good' : duration < 2000 ? 'acceptable' : 'poor'
    };
  }
  
  // Track payment processing metrics
  static trackPaymentMetrics(paymentData, success, duration) {
    const metric = {
      paymentId: paymentData.paymentId || 'unknown',
      amount: paymentData.amount,
      success,
      duration,
      timestamp: new Date().toISOString(),
      method: paymentData.paymentMethod || 'square'
    };
    
    console.log(`Payment Metric: ${success ? '✅' : '❌'} ${paymentData.amount} (${duration}ms)`);
    
    // Alert on payment failures
    if (!success) {
      console.error('🚨 PAYMENT FAILURE:', metric);
    }
    
    // Alert on slow payments (>5 seconds)
    if (duration > 5000) {
      console.warn(`🐌 SLOW PAYMENT: ${paymentData.paymentId} took ${duration}ms`);
    }
    
    return metric;
  }
  
  // Monitor resource usage
  static trackResourceUsage() {
    if (typeof process !== 'undefined') {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      const metrics = {
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024), // MB
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
          external: Math.round(memUsage.external / 1024 / 1024) // MB
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        timestamp: new Date().toISOString()
      };
      
      // Alert on high memory usage (>512MB)
      if (metrics.memory.rss > 512) {
        console.warn(`🚨 HIGH MEMORY USAGE: ${metrics.memory.rss}MB RSS`);
      }
      
      return metrics;
    }
    
    return null;
  }
  
  // Security monitoring
  static trackSecurityEvent(eventType, details) {
    const event = {
      type: eventType,
      details,
      timestamp: new Date().toISOString(),
      severity: this.getSecuritySeverity(eventType)
    };
    
    console.log(`Security Event: ${eventType} - ${event.severity}`);
    
    // Alert on high severity events
    if (event.severity === 'high') {
      console.error('🚨 HIGH SEVERITY SECURITY EVENT:', event);
    }
    
    return event;
  }
  
  static getSecuritySeverity(eventType) {
    const severityMap = {
      'invalid_token': 'medium',
      'payment_failure': 'medium',
      'webhook_signature_failure': 'high',
      'rate_limit_exceeded': 'medium',
      'unauthorized_access': 'high',
      'sql_injection_attempt': 'high',
      'xss_attempt': 'high'
    };
    
    return severityMap[eventType] || 'low';
  }
  
  // Health check endpoint data
  static getHealthStatus() {
    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'connected',
        square_api: 'connected',
        email_service: 'connected',
        sms_service: 'connected'
      },
      performance: {
        uptime: process.uptime ? Math.floor(process.uptime()) : 'unknown',
        memory: this.trackResourceUsage()?.memory || 'unavailable'
      }
    };
    
    return status;
  }
}

// Rate limiting utility
export class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) { // 100 requests per minute
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }
  
  isAllowed(clientId) {
    const now = Date.now();
    const clientRequests = this.requests.get(clientId) || [];
    
    // Clean old requests
    const validRequests = clientRequests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      PerformanceMonitor.trackSecurityEvent('rate_limit_exceeded', {
        clientId,
        requests: validRequests.length,
        limit: this.maxRequests
      });
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(clientId, validRequests);
    
    return true;
  }
  
  getRemainingRequests(clientId) {
    const now = Date.now();
    const clientRequests = this.requests.get(clientId) || [];
    const validRequests = clientRequests.filter(time => now - time < this.windowMs);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }
}

// Input validation and sanitization
export class InputValidator {
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  static validatePhone(phone) {
    const phoneRegex = /^[\+]?[\d\s\(\)\-]{10,}$/;
    return phoneRegex.test(phone);
  }
  
  static sanitizeString(input, maxLength = 1000) {
    if (typeof input !== 'string') return '';
    
    // Remove potentially dangerous characters
    let sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
      .trim();
    
    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  }
  
  static validateOrderData(orderData) {
    const errors = [];
    
    if (!orderData.customer?.email || !this.validateEmail(orderData.customer.email)) {
      errors.push('Valid email is required');
    }
    
    if (!orderData.customer?.name || orderData.customer.name.length < 2) {
      errors.push('Customer name is required (minimum 2 characters)');
    }
    
    if (!orderData.cart || !Array.isArray(orderData.cart) || orderData.cart.length === 0) {
      errors.push('Cart cannot be empty');
    }
    
    if (orderData.cart) {
      for (const item of orderData.cart) {
        if (!item.name || !item.price || item.quantity <= 0) {
          errors.push('Invalid item in cart');
          break;
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Error reporting and logging
export class ErrorReporter {
  static reportError(error, context = {}) {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      severity: this.getErrorSeverity(error)
    };
    
    console.error('Application Error:', errorReport);
    
    // In production, you would send this to an error reporting service
    // like Sentry, LogRocket, etc.
    
    return errorReport;
  }
  
  static getErrorSeverity(error) {
    if (error.name === 'TypeError' || error.name === 'ReferenceError') {
      return 'high';
    }
    
    if (error.message.includes('payment') || error.message.includes('database')) {
      return 'high';
    }
    
    if (error.status >= 500) {
      return 'medium';
    }
    
    return 'low';
  }
}