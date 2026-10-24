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
    databaseProvider: 'mongodb';
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
  
  try {
    const errors: string[] = [];
    
    // Check database connection
    let databaseHealthy = false;
    try {
      const { db } = await connectToDatabase();
      await db.command({ ping: 1 });
      databaseHealthy = true;
    } catch (error) {
      errors.push('Database connectivity check failed');
    }
    
    // Get memory usage
    // Use rss as the denominator because it reflects the process's actual
    // memory footprint in the container. heapTotal/heapUsed naturally run
    // very close together after GC and produce false-positive "high memory"
    // alerts in serverless environments.
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.rss;
    const usedMemory = memoryUsage.heapUsed;
    const memoryPercentage = totalMemory > 0 ? Math.round((usedMemory / totalMemory) * 100) : 0;

    // Determine overall status
    // A failed database dependency is a failed readiness check, never an HTTP 200.
    let status: HealthStatus['status'] = 'healthy';
    if (!databaseHealthy) {
      status = 'unhealthy';
    }
    // Flag only when heapUsed is a large fraction of the process RSS. This
    // is a more realistic signal of memory pressure than heapUsed/heapTotal.
    if (memoryPercentage > 85) {
      if (databaseHealthy) status = 'degraded';
      errors.push(`High memory usage: ${memoryPercentage}%`);
    }
    
    const health: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '2.0.0',
      uptime: process.uptime(),
      checks: {
        server: true,
        database: databaseHealthy,
        databaseProvider: 'mongodb',
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
    
    const httpStatus = status === 'healthy' ? 200 : 503;
    
    return NextResponse.json(health, {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${Date.now() - startTime}ms`
      }
    });
  } catch (error) {
    // A failed readiness handler must fail closed.
    const health: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '2.0.0',
      uptime: process.uptime(),
      checks: {
        server: true,
        database: false,
        databaseProvider: 'mongodb',
        memory: {
          used: 0,
          total: 0,
          percentage: 0
        }
      },
      errors: ['Health check failed']
    };
    
    return NextResponse.json(health, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}