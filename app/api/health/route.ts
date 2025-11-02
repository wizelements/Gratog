import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

// Store last webhook activity
let lastWebhookActivity = {
  timestamp: null as Date | null,
  eventType: null as string | null,
  status: null as string | null
};

export function updateWebhookActivity(eventType: string, status: string) {
  lastWebhookActivity = {
    timestamp: new Date(),
    eventType,
    status
  };
}

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Check database connection
    let dbStatus = 'disconnected';
    try {
      if (process.env.MONGO_URL) {
        const client = new MongoClient(process.env.MONGO_URL);
        await client.connect();
        await client.db().admin().ping();
        await client.close();
        dbStatus = 'connected';
      } else {
        dbStatus = 'not_configured';
      }
    } catch (dbError) {
      console.error('[health] Database check failed:', dbError);
      dbStatus = 'error';
    }

    // Check Square configuration
    const squareStatus = process.env.SQUARE_MOCK_MODE === 'true' 
      ? 'mock' 
      : process.env.SQUARE_ENVIRONMENT || 'production';

    // Check email/SMS configuration
    const emailConfigured = !!(process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY);
    const smsConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);

    // Check fulfillment configuration
    const fulfillmentConfig = {
      delivery: process.env.NEXT_PUBLIC_FULFILLMENT_DELIVERY || 'disabled',
      pickup: process.env.NEXT_PUBLIC_FULFILLMENT_PICKUP || 'enabled',
      shipping: process.env.NEXT_PUBLIC_FULFILLMENT_SHIPPING || 'enabled'
    };

    const responseTime = Date.now() - startTime;

    const health = {
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: dbStatus,
        square_api: squareStatus,
        email: emailConfigured ? 'configured' : 'not_configured',
        sms: smsConfigured ? 'configured' : 'not_configured'
      },
      fulfillment: fulfillmentConfig,
      webhooks: {
        lastActivity: lastWebhookActivity.timestamp?.toISOString() || 'none',
        lastEventType: lastWebhookActivity.eventType || 'none',
        lastStatus: lastWebhookActivity.status || 'none'
      },
      performance: {
        response_time_ms: responseTime,
        uptime_seconds: process.uptime()
      }
    };

    return NextResponse.json(health, {
      status: health.status === 'healthy' ? 200 : 503
    });

  } catch (error) {
    console.error('[health] Health check error:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
      response_time_ms: Date.now() - startTime
    }, { status: 503 });
  }
}
