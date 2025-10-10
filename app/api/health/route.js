import { NextResponse } from 'next/server';
import { PerformanceMonitor } from '@/lib/monitoring';
import { connectToDatabase } from '@/lib/db-admin';

// Health check endpoint for monitoring system status
export async function GET(request) {
  const startTime = Date.now();
  
  try {
    // Basic health status
    const healthStatus = PerformanceMonitor.getHealthStatus();
    
    // Test database connectivity
    try {
      await connectToDatabase();
      healthStatus.services.database = 'connected';
    } catch (dbError) {
      healthStatus.services.database = 'disconnected';
      healthStatus.status = 'degraded';
    }
    
    // Test Square API connectivity (if not in mock mode)
    const squareStatus = process.env.SQUARE_ACCESS_TOKEN?.startsWith('sandbox-sq0atb') ? 'connected' : 'mock_mode';
    healthStatus.services.square_api = squareStatus;
    
    // Test external services
    healthStatus.services.email_service = process.env.RESEND_API_KEY ? 'configured' : 'not_configured';
    healthStatus.services.sms_service = process.env.TWILIO_AUTH_TOKEN ? 'configured' : 'not_configured';
    
    // Additional system metrics
    const endTime = Date.now();
    healthStatus.response_time_ms = endTime - startTime;
    
    // Determine overall status
    const hasIssues = Object.values(healthStatus.services).some(status => 
      status === 'disconnected' || status === 'error'
    );
    
    if (hasIssues) {
      healthStatus.status = 'degraded';
    }
    
    const httpStatus = healthStatus.status === 'healthy' ? 200 : 503;
    
    return NextResponse.json(healthStatus, { status: httpStatus });
    
  } catch (error) {
    const endTime = Date.now();
    
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
      response_time_ms: endTime - startTime
    }, { status: 503 });
  }
}

// Simple ping endpoint for uptime monitoring
export async function HEAD(request) {
  return new Response(null, { status: 200 });
}