/**
 * Centralized logging utility with structured logging
 * Provides consistent log format across the application
 * Only logs in development mode or when explicitly enabled
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const CURRENT_LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ENABLE_LOGS = process.env.DEBUG === 'true' || process.env.LOG_ENABLED === 'true';

class Logger {
  constructor(context) {
    this.context = context;
  }

  _log(level, message, data = {}) {
    if (LOG_LEVELS[level] < LOG_LEVELS[CURRENT_LOG_LEVEL]) {
      return;
    }

    // Only log in development or when explicitly enabled
    if (IS_PRODUCTION && !ENABLE_LOGS) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      ...data,
    };

    const emoji = {
      DEBUG: '🔍',
      INFO: 'ℹ️',
      WARN: '⚠️',
      ERROR: '❌',
    }[level];

    // Use appropriate console method based on level
    const consoleMethod = {
      DEBUG: 'debug',
      INFO: 'log',
      WARN: 'warn',
      ERROR: 'error',
    }[level];

    if (typeof console[consoleMethod] === 'function') {
      console[consoleMethod](`${emoji} [${timestamp}] [${level}] [${this.context}] ${message}`, data);
    }
  }

  debug(message, data) {
    this._log('DEBUG', message, data);
  }

  info(message, data) {
    this._log('INFO', message, data);
  }

  warn(message, data) {
    this._log('WARN', message, data);
  }

  error(message, data) {
    this._log('ERROR', message, data);
  }

  api(method, endpoint, status, duration, data = {}) {
    this.info(`API ${method} ${endpoint} - ${status}`, {
      method,
      endpoint,
      status,
      duration: `${duration}ms`,
      ...data,
    });
  }

  cart(action, data = {}) {
    this.info(`CART: ${action}`, data);
  }

  payment(action, data = {}) {
    this.info(`PAYMENT: ${action}`, data);
  }
}

export function createLogger(context) {
  return new Logger(context);
}

/**
 * Static logger with category-based error logging
 * Usage: logger.error('Category', 'Message', error)
 * Automatically includes stack traces for errors
 */
export const logger = {
  error(category, message, error) {
    const errorData = error instanceof Error 
      ? { error: error.message, stack: error.stack }
      : { error };
    console.error(`❌ [${category}] ${message}`, errorData);
  },
  
  warn(category, message, data = {}) {
    console.warn(`⚠️ [${category}] ${message}`, data);
  },
  
  info(category, message, data = {}) {
    console.log(`ℹ️ [${category}] ${message}`, data);
  },
  
  debug(category, message, data = {}) {
    if (process.env.DEBUG === 'true') {
      console.debug(`🔍 [${category}] ${message}`, data);
    }
  },

  withCategory(category) {
    return {
      error: (message, error) => logger.error(category, message, error),
      warn: (message, data) => logger.warn(category, message, data),
      info: (message, data) => logger.info(category, message, data),
      debug: (message, data) => logger.debug(category, message, data),
    };
  }
};

export default Logger;
