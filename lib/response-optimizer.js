const DEBUG = process.env.DEBUG === "true" || process.env.VERBOSE === "true";
const debug = (...args) => { if (DEBUG) debug(...args); };

// Response optimization utilities for production performance
import { NextResponse } from 'next/server';

// Response compression and caching utilities
export class ResponseOptimizer {
  
  // Create optimized JSON response with caching headers
  static json(data, options = {}) {
    const {
      status = 200,
      cacheMaxAge = 60, // Default 1 minute cache
      staleWhileRevalidate = 300, // 5 minutes stale-while-revalidate
      compress = true
    } = options;
    
    const response = NextResponse.json(data, { status });
    
    // Add caching headers for performance
    if (cacheMaxAge > 0) {
      response.headers.set(
        'Cache-Control', 
        `public, max-age=${cacheMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`
      );
      response.headers.set('ETag', `"${this.generateETag(data)}"`);
    }
    
    // Add compression hint (disabled for now to fix gzip issues)
    if (compress && false) { // Temporarily disabled
      response.headers.set('Content-Encoding', 'gzip');
      response.headers.set('Vary', 'Accept-Encoding');
    }
    
    // Performance headers
    response.headers.set('X-Response-Time', Date.now().toString());
    
    return response;
  }
  
  // Generate ETag for caching
  static generateETag(data) {
    const hash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');
    return hash.substring(0, 8);
  }
  
  // Check if request has matching ETag (304 optimization)
  static checkETag(request, data) {
    const requestETag = request.headers.get('if-none-match');
    const dataETag = `"${this.generateETag(data)}"`;
    
    if (requestETag === dataETag) {
      return NextResponse.json(null, { status: 304 });
    }
    
    return null; // No match, proceed with full response
  }
  
  // Create error response with proper formatting
  static error(message, status = 500, details = {}) {
    const errorData = {
      error: message,
      status,
      timestamp: new Date().toISOString(),
      ...details
    };
    
    return this.json(errorData, { 
      status, 
      cacheMaxAge: 0 // Don't cache errors
    });
  }
  
  // Performance monitoring wrapper
  static async withTiming(handler, context = {}) {
    const startTime = Date.now();
    
    try {
      const result = await handler();
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Log slow responses
      if (duration > 1000) {
        console.warn(`Slow API response: ${context.endpoint || 'unknown'} took ${duration}ms`);
      }
      
      // Add timing header
      if (result.headers) {
        result.headers.set('Server-Timing', `total;dur=${duration}`);
      }
      
      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.error(`API error in ${context.endpoint || 'unknown'} after ${duration}ms:`, error);
      throw error;
    }
  }
}

// Database query optimization wrapper
export class QueryOptimizer {
  
  // Optimize database queries with connection pooling
  static async withConnection(queryFn) {
    const { connectToDatabase } = require('./db-optimized');
    
    try {
      const { db } = await connectToDatabase();
      return await queryFn(db);
    } catch (error) {
      console.error('Database query failed:', error);
      throw new Error('Database operation failed');
    }
  }
  
  // Batch multiple queries for better performance
  static async batchQueries(queries) {
    const results = [];
    
    for (const query of queries) {
      try {
        const result = await this.withConnection(query);
        results.push(result);
      } catch (error) {
        console.error('Batch query failed:', error);
        results.push(null);
      }
    }
    
    return results;
  }
  
  // Paginated query with performance optimization
  static async paginate(collection, query = {}, options = {}) {
    const {
      page = 1,
      limit = 20,
      sort = { createdAt: -1 },
      projection = {}
    } = options;
    
    const skip = (page - 1) * limit;
    
    return this.withConnection(async (db) => {
      const [data, total] = await Promise.all([
        db.collection(collection)
          .find(query, { projection })
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        db.collection(collection).countDocuments(query)
      ]);
      
      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    });
  }
}

// Memory optimization utilities
export class MemoryOptimizer {
  
  // Clean up large objects to prevent memory leaks
  static cleanup(obj) {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        delete obj[key];
      });
    }
  }
  
  // Monitor memory usage
  static getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        rss: Math.round(usage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
        external: Math.round(usage.external / 1024 / 1024) // MB
      };
    }
    return null;
  }
  
  // Force garbage collection if available
  static forceGC() {
    if (typeof global !== 'undefined' && global.gc) {
      try {
        global.gc();
        debug('Forced garbage collection');
      } catch (error) {
        console.warn('Garbage collection failed:', error);
      }
    }
  }
  
  // Memory pressure monitoring
  static monitorMemoryPressure() {
    const usage = this.getMemoryUsage();
    if (usage && usage.heapUsed > 500) { // 500MB threshold
      console.warn(`High memory usage detected: ${usage.heapUsed}MB`);
      this.forceGC();
      return true;
    }
    return false;
  }
}

// API rate limiting for production
export class RateLimitOptimizer {
  static limits = new Map();
  
  static checkLimit(clientId, maxRequests = 100, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get existing requests for this client
    let clientRequests = this.limits.get(clientId) || [];
    
    // Filter out old requests outside the window
    clientRequests = clientRequests.filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (clientRequests.length >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: windowStart + windowMs
      };
    }
    
    // Add current request
    clientRequests.push(now);
    this.limits.set(clientId, clientRequests);
    
    return {
      allowed: true,
      remaining: maxRequests - clientRequests.length,
      resetTime: windowStart + windowMs
    };
  }
  
  static addHeaders(response, limitInfo) {
    response.headers.set('X-RateLimit-Remaining', limitInfo.remaining.toString());
    response.headers.set('X-RateLimit-Reset', limitInfo.resetTime.toString());
    return response;
  }
}