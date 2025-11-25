import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
  
  // Session Replay
  replaysSessionSampleRate: 0.01, // 1% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  
  // Environment
  environment: process.env.NODE_ENV || 'production',
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  
  // Integration
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  
  // Filter out common noise
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    // Random plugins/extensions
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    // Facebook errors
    'fb_xd_fragment',
    // Harmless errors
    'Non-Error promise rejection captured',
  ],
  
  beforeSend(event, hint) {
    // Filter out admin auth errors from monitoring
    if (event.exception?.values?.[0]?.value?.includes('admin_token')) {
      return null;
    }
    
    // Add custom context
    event.contexts = {
      ...event.contexts,
      app: {
        name: 'Taste of Gratitude',
        version: '1.0.0',
      },
    };
    
    return event;
  },
});
