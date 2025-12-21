/**
 * Health Check Endpoint
 * Used by CI/CD and monitoring to verify server is running
 */

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    server: boolean;
    database: boolean;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  errors?: string[];
}

export async function GET() {
  const startTime = Date.now();
  const errors: string[] = [];
  
  // Check database connection
  let databaseHealthy = false;
  try {
    const { db } = await connectToDatabase();
    await db.command({ ping: 1 });
    databaseHealthy = true;
  } catch (error) {
    errors.push(`Database: ${error instanceof Error ? error.message : 'Connection failed'}`);
  }
  
  // Get memory usage
  const memoryUsage = process.memoryUsage();
  const totalMemory = memoryUsage.heapTotal;
  const usedMemory = memoryUsage.heapUsed;
  
  // Determine overall status
  let status: HealthStatus['status'] = 'healthy';
  if (!databaseHealthy) {
    status = 'unhealthy';
  } else if (usedMemory / totalMemory > 0.9) {
    status = 'degraded';
    errors.push('High memory usage');
  }
  
  const health: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '2.0.0',
    uptime: process.uptime(),
    checks: {
      server: true,
      database: databaseHealthy,
      memory: {
        used: Math.round(usedMemory / 1024 / 1024),
        total: Math.round(totalMemory / 1024 / 1024),
        percentage: Math.round((usedMemory / totalMemory) * 100)
      }
    }
  };
  
  if (errors.length > 0) {
    health.errors = errors;
  }
  
  const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
  
  return NextResponse.json(health, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Response-Time': `${Date.now() - startTime}ms`
    }
  });
}
