import { NextResponse } from 'next/server';
import { getSquareHealthStatus, getSquareServerConfig } from '@/lib/payments/config';

/**
 * Payment System Health Check
 * 
 * GET /api/health/payments
 * 
 * Returns configuration status and optionally tests Square API connectivity.
 * Use this endpoint for:
 * - Uptime monitoring
 * - Pre-deploy smoke tests
 * - Debugging configuration issues
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deepCheck = searchParams.get('deep') === 'true';
  
  try {
    const health = getSquareHealthStatus();
    
    const response: Record<string, unknown> = {
      service: 'payments',
      timestamp: new Date().toISOString(),
      ...health,
    };
    
    // Optional: Test Square API connectivity
    if (deepCheck && health.ok) {
      try {
        const config = getSquareServerConfig();
        
        const squareResponse = await fetch(`${config.baseUrl}/v2/locations/${config.locationId}`, {
          headers: {
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json',
            'Square-Version': '2024-01-18',
          },
        });
        
        if (squareResponse.ok) {
          const data = await squareResponse.json();
          response.squareConnectivity = {
            ok: true,
            locationName: data.location?.name,
            status: data.location?.status,
          };
        } else {
          response.squareConnectivity = {
            ok: false,
            error: `Square API returned ${squareResponse.status}`,
          };
          response.ok = false;
        }
      } catch (squareError) {
        response.squareConnectivity = {
          ok: false,
          error: squareError instanceof Error ? squareError.message : 'Unknown error',
        };
        response.ok = false;
      }
    }
    
    return NextResponse.json(response, {
      status: health.ok ? 200 : 503,
    });
    
  } catch (error) {
    return NextResponse.json({
      service: 'payments',
      ok: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
    }, { status: 503 });
  }
}
