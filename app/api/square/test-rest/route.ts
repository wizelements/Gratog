import { NextResponse } from 'next/server';
import { getSquareClient } from '@/lib/square';
import { logger } from '@/lib/logger';

/**
 * Test REST API connectivity
 */
export async function GET() {
  try {
    logger.info('SQUARE-REST', 'Testing Square API...');
    
    const square = getSquareClient();
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: {}
    };
    
    // Test 1: List Locations
    try {
      const locationsResponse = await square.locations.list();
      results.tests.locations = {
        success: true,
        count: locationsResponse.locations?.length || 0,
        data: locationsResponse.locations?.map((loc: any) => ({
          id: loc.id,
          name: loc.name,
          status: loc.status
        }))
      };
    } catch (error: any) {
      results.tests.locations = {
        success: false,
        error: error.message,
        status: error.status
      };
    }
    
    // Test 2: List Payments
    try {
      const paymentsResponse = await square.payments.list({ limit: 3 });
      results.tests.payments = {
        success: true,
        count: paymentsResponse.data?.length || 0,
        recentPayment: paymentsResponse.data?.[0] ? {
          id: paymentsResponse.data[0].id,
          amount: paymentsResponse.data[0].amountMoney,
          status: paymentsResponse.data[0].status
        } : null
      };
    } catch (error: any) {
      results.tests.payments = {
        success: false,
        error: error.message,
        status: error.status
      };
    }
    
    // Test 3: List Catalog
    try {
      const catalogResponse = await square.catalog.list({ types: 'ITEM' });
      results.tests.catalog = {
        success: true,
        count: catalogResponse.data?.length || 0
      };
    } catch (error: any) {
      results.tests.catalog = {
        success: false,
        error: error.message,
        status: error.status
      };
    }
    
    // Overall health
    const allSuccess = Object.values(results.tests).every((test: any) => test.success);
    results.overall = allSuccess ? 'HEALTHY' : 'PARTIAL';
    
    return NextResponse.json(results, { 
      status: allSuccess ? 200 : 207 
    });
    
  } catch (error) {
    logger.error('SQUARE-REST', 'Square REST test error', error);
    return NextResponse.json(
      {
        overall: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
