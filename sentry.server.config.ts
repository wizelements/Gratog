import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: 0.1,
  
  // Environment
  environment: process.env.NODE_ENV || 'production',
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  
  // Filter sensitive data
  beforeSend(event) {
    // Remove sensitive headers
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    
    // Remove sensitive query params
    if (event.request?.query_string) {
      const queryString = event.request.query_string;
      const filtered = typeof queryString === 'string'
        ? queryString.split('&').filter(param => !param.startsWith('token=') && !param.startsWith('key=')).join('&')
        : queryString;
      event.request.query_string = filtered;
    }
    
    return event;
  },
  
  // Ignore errors from these paths
  ignoreErrors: [
    // Admin auth errors (handled locally)
    /admin.*token/i,
    // Network errors (offline handling)
    'NetworkError',
    'Failed to fetch',
  ],
});
