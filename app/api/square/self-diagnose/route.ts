
import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

/**
 * GRATOG SQUARE AUTH RESOLVER - Runtime Self-Diagnosis
 * 
 * Performs live Square API verification and stores status
 * Generates public status file for monitoring
 */

export async function GET(request: Request) {
  const LOG_PREFIX = '[SELF-DIAGNOSE]';
  
  debug(`${LOG_PREFIX} 🔍 Starting Square self-diagnosis...`);
  
  const report = {
    timestamp: new Date().toISOString(),
    status: 'unknown',
    environment: process.env.SQUARE_ENVIRONMENT || 'sandbox',
    tests: {} as Record<string, any>,
    errors: [] as string[],
    recommendations: [] as string[]
  };
  
  try {
    const accessToken = process.env.SQUARE_ACCESS_TOKEN?.trim();
    const environment = (process.env.SQUARE_ENVIRONMENT || 'sandbox').trim().toLowerCase();
    const locationId = process.env.SQUARE_LOCATION_ID?.trim();
    
    const baseUrl = environment === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';
    
    // Test 1: Environment Configuration
    debug(`${LOG_PREFIX} Checking environment configuration...`);
    report.tests.configuration = {
      status: 'PASS',
      environment,
      baseUrl,
      hasToken: !!accessToken,
      hasLocationId: !!locationId,
      tokenPrefix: accessToken?.substring(0, 10)
    };
    
    if (!accessToken) {
      report.errors.push('SQUARE_ACCESS_TOKEN not configured');
      report.status = 'failed';
      return NextResponse.json(report, { status: 503 });
    }
    
    // Test 2: Merchant API
    debug(`${LOG_PREFIX} Testing Merchant API...`);
    try {
      const merchantResponse = await fetch(`${baseUrl}/v2/merchants`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Square-Version': '2025-01-22',
          'Content-Type': 'application/json'
        }
      });
      
      if (merchantResponse.ok) {
        const merchantData = await merchantResponse.json();
        const merchant = merchantData.merchant?.[0];
        
        report.tests.merchant = {
          status: 'PASS',
          businessName: merchant?.business_name,
          country: merchant?.country,
          currency: merchant?.currency
        };
        
        debug(`${LOG_PREFIX} ✅ Merchant verified: ${merchant?.business_name}`);
      } else {
        const errorData = await merchantResponse.json();
        report.tests.merchant = {
          status: 'FAIL',
          statusCode: merchantResponse.status,
          error: errorData
        };
        report.errors.push(`Merchant API failed: ${merchantResponse.status}`);
      }
    } catch (err: any) {
      report.tests.merchant = {
        status: 'ERROR',
        error: err.message
      };
      report.errors.push(`Merchant API error: ${err.message}`);
    }
    
    // Test 3: Locations API
    debug(`${LOG_PREFIX} Testing Locations API...`);
    try {
      const locationsResponse = await fetch(`${baseUrl}/v2/locations`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Square-Version': '2025-01-22'
        }
      });
      
      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json();
        const locations = locationsData.locations || [];
        const configuredLocation = locations.find((loc: any) => loc.id === locationId);
        
        report.tests.locations = {
          status: configuredLocation ? 'PASS' : 'WARN',
          locationsFound: locations.length,
          configuredLocationFound: !!configuredLocation,
          configuredLocationName: configuredLocation?.name,
          allLocations: locations.map((loc: any) => ({
            id: loc.id,
            name: loc.name,
            status: loc.status
          }))
        };
        
        if (!configuredLocation) {
          report.errors.push(`Configured location ${locationId} not found`);
          report.recommendations.push('Update SQUARE_LOCATION_ID to match an available location');
        }
      } else {
        const errorData = await locationsResponse.json();
        report.tests.locations = {
          status: 'FAIL',
          statusCode: locationsResponse.status,
          error: errorData
        };
        report.errors.push(`Locations API failed: ${locationsResponse.status}`);
      }
    } catch (err: any) {
      report.tests.locations = {
        status: 'ERROR',
        error: err.message
      };
    }
    
    // Test 4: Catalog API
    debug(`${LOG_PREFIX} Testing Catalog API...`);
    try {
      const catalogResponse = await fetch(`${baseUrl}/v2/catalog/list?types=ITEM&limit=5`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Square-Version': '2025-01-22'
        }
      });
      
      if (catalogResponse.ok) {
        const catalogData = await catalogResponse.json();
        const items = catalogData.objects || [];
        
        report.tests.catalog = {
          status: 'PASS',
          itemsFound: items.length,
          isEmpty: items.length === 0,
          sampleItems: items.slice(0, 3).map((item: any) => ({
            id: item.id,
            name: item.item_data?.name
          }))
        };
        
        if (items.length === 0) {
          report.recommendations.push('Catalog is empty - add products in Square Dashboard');
        }
      } else {
        const errorData = await catalogResponse.json();
        report.tests.catalog = {
          status: 'FAIL',
          statusCode: catalogResponse.status,
          error: errorData
        };
        report.errors.push(`Catalog API failed: ${catalogResponse.status}`);
      }
    } catch (err: any) {
      report.tests.catalog = {
        status: 'ERROR',
        error: err.message
      };
    }
    
    // Determine overall status
    const testResults = Object.values(report.tests);
    const failedTests = testResults.filter((t: any) => t.status === 'FAIL' || t.status === 'ERROR');
    const passedTests = testResults.filter((t: any) => t.status === 'PASS');
    
    if (failedTests.length === 0) {
      report.status = 'verified';
      debug(`${LOG_PREFIX} ✅ All tests passed`);
    } else if (passedTests.length > 0) {
      report.status = 'partial';
      debug(`${LOG_PREFIX} ⚠️  Some tests failed`);
    } else {
      report.status = 'failed';
      debug(`${LOG_PREFIX} ❌ All tests failed`);
    }
    
    // Save status to public file for monitoring
    try {
      const statusFilePath = join(process.cwd(), 'public', '__square_status.json');
      const publicStatus = {
        status: report.status,
        lastChecked: report.timestamp,
        environment: report.environment,
        merchant: report.tests.merchant?.businessName,
        catalogItems: report.tests.catalog?.itemsFound
      };
      
      await writeFile(statusFilePath, JSON.stringify(publicStatus, null, 2));
      debug(`${LOG_PREFIX} ✅ Status file written to /public/__square_status.json`);
    } catch (err) {
      console.error(`${LOG_PREFIX} ⚠️  Could not write status file:`, err);
    }
    
    return NextResponse.json(report, {
      status: report.status === 'verified' ? 200 : 
              report.status === 'partial' ? 207 : 503
    });
    
  } catch (error: any) {
    console.error(`${LOG_PREFIX} ❌ Self-diagnosis failed:`, error);
    
    report.status = 'error';
    report.errors.push(`Self-diagnosis error: ${error.message}`);
    
    return NextResponse.json(report, { status: 500 });
  }
}
