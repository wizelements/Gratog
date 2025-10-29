import { NextResponse } from 'next/server';
import { listLocations, listPayments, listCatalog } from '@/lib/square-ops';

/**
 * Test REST API connectivity
 */
export async function GET() {
  try {
    console.log('Testing Square REST API...');
    
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: {}
    };
    
    // Test 1: List Locations
    try {
      const locationsResponse = await listLocations();
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
      const paymentsResponse = await listPayments({ limit: 3 });
      results.tests.payments = {
        success: true,
        count: paymentsResponse.payments?.length || 0,
        recentPayment: paymentsResponse.payments?.[0] ? {
          id: paymentsResponse.payments[0].id,
          amount: paymentsResponse.payments[0].amount_money,
          status: paymentsResponse.payments[0].status
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
      const catalogResponse = await listCatalog('ITEM');
      results.tests.catalog = {
        success: true,
        count: catalogResponse.objects?.length || 0
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
    console.error('Square REST test error:', error);
    return NextResponse.json(
      {
        overall: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
