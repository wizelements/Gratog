export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { validateStartupConfig } from '@/lib/startup-validator';
import { blockInProduction } from '@/lib/diagnostics-guard';

/**
 * Startup Validation Endpoint
 * Check if the application is properly configured
 *
 * SECURITY: hidden in production (returns 404) — startup config leaks
 * sensitive infra detail (presence of secrets, environment shape).
 */
export async function GET(request: NextRequest) {
  const blocked = blockInProduction(request);
  if (blocked) return blocked;
  try {
    const validation = validateStartupConfig();
    
    return NextResponse.json({
      valid: validation.valid,
      environment: validation.environment,
      errors: validation.errors,
      warnings: validation.warnings,
      timestamp: new Date().toISOString()
    }, {
      status: validation.valid ? 200 : 500
    });
  } catch (error) {
    console.error('❌ Startup validation error:', { error: (error as Error).message, stack: (error as Error).stack });
    return NextResponse.json(
      {
        valid: false,
        error: 'Startup validation failed',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}
