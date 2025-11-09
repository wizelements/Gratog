import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const logger = createLogger('SquarePublicConfigAPI');

/**
 * GET /api/square/config
 * Returns public Square configuration for Web Payments SDK
 */
export async function GET() {
  try {
    const config = {
      applicationId: process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID,
      locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
      environment: process.env.SQUARE_ENVIRONMENT || 'production'
    };

    // Validate config
    if (!config.applicationId || !config.locationId) {
      logger.error('Square configuration missing');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Square payment system not configured' 
        },
        { status: 503 }
      );
    }

    logger.info('Square config requested', { environment: config.environment });

    return NextResponse.json({
      success: true,
      config
    });
  } catch (error) {
    logger.error('Failed to get Square config', { error: error.message });
    return NextResponse.json(
      { success: false, error: 'Failed to load payment configuration' },
      { status: 500 }
    );
  }
}
