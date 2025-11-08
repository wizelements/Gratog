import { NextResponse } from 'next/server';

/**
 * Debug endpoint to view environment configuration
 * DO NOT expose in production - for debugging only
 */
export async function GET(request) {
  // Only allow in development or with secret key
  const debugSecret = request.headers.get('x-debug-secret');
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!isDev && debugSecret !== process.env.DEBUG_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const envCheck = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    platform: process.env.VERCEL ? 'Vercel' : 'Local',
    
    database: {
      MONGODB_URI: !!process.env.MONGODB_URI ? 'SET' : 'NOT SET',
      MONGO_URL: !!process.env.MONGO_URL ? 'SET' : 'NOT SET',
      DATABASE_NAME: process.env.DATABASE_NAME || 'taste_of_gratitude (default)',
      mongoUriPrefix: process.env.MONGODB_URI?.substring(0, 20) || 'N/A'
    },
    
    auth: {
      JWT_SECRET: !!process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      jwtSecretLength: process.env.JWT_SECRET?.length || 0,
      ADMIN_SECRET: !!process.env.ADMIN_SECRET ? 'SET' : 'NOT SET',
      INIT_SECRET: !!process.env.INIT_SECRET ? 'SET' : 'NOT SET'
    },
    
    square: {
      SQUARE_ACCESS_TOKEN: !!process.env.SQUARE_ACCESS_TOKEN ? 'SET' : 'NOT SET',
      tokenLength: process.env.SQUARE_ACCESS_TOKEN?.length || 0,
      tokenPrefix: process.env.SQUARE_ACCESS_TOKEN?.substring(0, 10) || 'N/A',
      isClientSecret: process.env.SQUARE_ACCESS_TOKEN?.startsWith('sq0csp-') || false,
      SQUARE_ENVIRONMENT: process.env.SQUARE_ENVIRONMENT || 'production (default)',
      SQUARE_LOCATION_ID: process.env.SQUARE_LOCATION_ID || 'NOT SET',
      NEXT_PUBLIC_SQUARE_APPLICATION_ID: process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || 'NOT SET',
      SQUARE_WEBHOOK_SIGNATURE_KEY: !!process.env.SQUARE_WEBHOOK_SIGNATURE_KEY ? 'SET' : 'NOT SET'
    },
    
    fulfillment: {
      NEXT_PUBLIC_FULFILLMENT_DELIVERY: process.env.NEXT_PUBLIC_FULFILLMENT_DELIVERY || 'NOT SET',
      NEXT_PUBLIC_FULFILLMENT_PICKUP: process.env.NEXT_PUBLIC_FULFILLMENT_PICKUP || 'NOT SET',
      NEXT_PUBLIC_FULFILLMENT_SHIPPING: process.env.NEXT_PUBLIC_FULFILLMENT_SHIPPING || 'NOT SET'
    },
    
    features: {
      FEATURE_CHECKOUT_V2: process.env.FEATURE_CHECKOUT_V2 || 'NOT SET',
      DEBUG: process.env.DEBUG || 'NOT SET'
    },
    
    services: {
      RESEND_API_KEY: !!process.env.RESEND_API_KEY ? 'SET' : 'NOT SET',
      TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET'
    }
  };
  
  // Check for critical issues
  const issues = [];
  
  if (!envCheck.database.MONGODB_URI && !envCheck.database.MONGO_URL) {
    issues.push('❌ CRITICAL: No MongoDB URI configured');
  }
  
  if (!envCheck.auth.JWT_SECRET) {
    issues.push('❌ CRITICAL: JWT_SECRET not set - admin login will fail');
  }
  
  if (!envCheck.square.SQUARE_ACCESS_TOKEN) {
    issues.push('❌ CRITICAL: SQUARE_ACCESS_TOKEN not set - payments will fail');
  }
  
  if (envCheck.square.isClientSecret) {
    issues.push('❌ ERROR: Using Client Secret (sq0csp-) instead of Access Token (EAAA-)');
  }
  
  return NextResponse.json({
    status: issues.length === 0 ? 'healthy' : 'issues_found',
    issues,
    issueCount: issues.length,
    environment: envCheck
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache'
    }
  });
}
