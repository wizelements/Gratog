/**
 * Client-side logger for 'use client' components
 * 
 * This is a lightweight logger that works safely in the browser
 * without accessing server-side environment variables.
 * 
 * Use this in 'use client' components instead of the server logger.
 */

function formatError(error) {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return error;
}

const IS_DEV = typeof window !== 'undefined' && 
  (window.location?.hostname === 'localhost' || 
   window.location?.hostname === '127.0.0.1');

export const clientLogger = {
  error(category, message, error) {
    console.error(`❌ [${category}] ${message}`, error ? formatError(error) : '');
  },
  
  warn(category, message, data) {
    console.warn(`⚠️ [${category}] ${message}`, data || '');
  },
  
  info(category, message, data) {
    if (IS_DEV) {
      console.info(`ℹ️ [${category}] ${message}`, data || '');
    }
  },
  
  debug(category, message, data) {
    if (IS_DEV) {
      console.debug(`🔍 [${category}] ${message}`, data || '');
    }
  },
};

export default clientLogger;
