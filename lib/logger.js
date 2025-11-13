/**
 * Centralized logging utility with structured logging
 * Provides consistent log format across the application
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const CURRENT_LOG_LEVEL = process.env.LOG_LEVEL || 'DEBUG';

class Logger {
  constructor(context) {
    this.context = context;
  }

  _log(level, message, data = {}) {
    if (LOG_LEVELS[level] < LOG_LEVELS[CURRENT_LOG_LEVEL]) {
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

    console.log(`${emoji} [${timestamp}] [${level}] [${this.context}] ${message}`, data);
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

export default Logger;
