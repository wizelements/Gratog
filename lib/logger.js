/**
 * Comprehensive Logging Utility
 * Provides detailed error tracking with context
 */

const LOG_LEVELS = {
  ERROR: '❌',
  WARN: '⚠️',
  INFO: 'ℹ️',
  SUCCESS: '✅',
  DEBUG: '🔍'
};

function formatTimestamp() {
  return new Date().toISOString();
}

function formatLog(level, category, message, context = {}) {
  const timestamp = formatTimestamp();
  const prefix = `[${timestamp}] ${LOG_LEVELS[level] || '•'} [${category}]`;
  
  const logData = {
    timestamp,
    level,
    category,
    message,
    ...context
  };

  return { prefix, message, logData };
}

export const logger = {
  error(category, message, error, context = {}) {
    const { prefix, logData } = formatLog('ERROR', category, message, {
      ...context,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
        ...(error.response && { 
          status: error.response.status,
          data: error.response.data 
        })
      } : undefined
    });

    console.error(prefix, message);
    console.error('Error details:', logData);
    
    if (error) {
      console.error('Stack trace:', error.stack);
    }

    return logData;
  },

  warn(category, message, context = {}) {
    const { prefix, logData } = formatLog('WARN', category, message, context);
    console.warn(prefix, message);
    if (Object.keys(context).length > 0) {
      console.warn('Context:', context);
    }
    return logData;
  },

  info(category, message, context = {}) {
    const { prefix, logData } = formatLog('INFO', category, message, context);
    console.log(prefix, message);
    if (Object.keys(context).length > 0) {
      console.log('Context:', context);
    }
    return logData;
  },

  success(category, message, context = {}) {
    const { prefix, logData } = formatLog('SUCCESS', category, message, context);
    console.log(prefix, message);
    if (Object.keys(context).length > 0) {
      console.log('Context:', context);
    }
    return logData;
  },

  debug(category, message, context = {}) {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      const { prefix, logData } = formatLog('DEBUG', category, message, context);
      console.log(prefix, message);
      if (Object.keys(context).length > 0) {
        console.log('Debug context:', context);
      }
      return logData;
    }
  },

  // Specific helpers for common scenarios
  authError(message, error, context = {}) {
    return this.error('AUTH', message, error, context);
  },

  dbError(message, error, context = {}) {
    return this.error('DATABASE', message, error, context);
  },

  apiError(message, error, context = {}) {
    return this.error('API', message, error, context);
  },

  squareError(message, error, context = {}) {
    return this.error('SQUARE', message, error, context);
  },

  // Request logging helper
  logRequest(req, additionalContext = {}) {
    return this.info('REQUEST', `${req.method} ${req.url}`, {
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers.get('user-agent'),
        'content-type': req.headers.get('content-type'),
        'referer': req.headers.get('referer')
      },
      cookies: req.cookies ? Object.keys(req.cookies) : [],
      ...additionalContext
    });
  },

  // Environment check helper
  checkEnv(variables) {
    const missing = [];
    const present = [];

    variables.forEach(varName => {
      if (process.env[varName]) {
        present.push(varName);
      } else {
        missing.push(varName);
      }
    });

    if (missing.length > 0) {
      this.error('ENV_CHECK', `Missing environment variables`, null, {
        missing,
        present,
        total: variables.length,
        missingCount: missing.length
      });
    } else {
      this.success('ENV_CHECK', 'All required environment variables present', {
        checked: variables,
        count: variables.length
      });
    }

    return { missing, present };
  }
};

export default logger;
