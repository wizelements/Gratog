/**
 * Square Verification Script
 * Tests if Square API is configured and working
 * DELETE THIS FILE AFTER CONFIRMING IT WORKS
 */

import { NextResponse } from 'next/server';
import { Client, Environment } from 'square';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    checks: {}
  };

  // Check 1: Environment variables
  results.checks.env = {
    hasSquareToken: !!process.env.SQUARE_ACCESS_TOKEN,
    hasLocationId: !!process.env.SQUARE_LOCATION_ID,
    hasAppId: !!process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID,
    squareEnv: process.env.SQUARE_ENVIRONMENT,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV
  };

  // Check 2: Try to initialize Square client
  try {
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      throw new Error('SQUARE_ACCESS_TOKEN not set');
    }

    const client = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: process.env.SQUARE_ENVIRONMENT === 'production' 
        ? Environment.Production 
        : Environment.Sandbox,
    });

    results.checks.squareClient = 'initialized';

    // Check 3: Try to list locations
    try {
      const { result: locResult } = await client.locationsApi.listLocations();
      results.checks.locations = {
        count: locResult.locations?.length || 0,
        locations: locResult.locations?.map((l: any) => ({
          id: l.id,
          name: l.name,
          status: l.status
        }))
      };
    } catch (locError: any) {
      results.checks.locations = {
        error: locError.message,
        status: locError.statusCode
      };
    }

    // Check 4: Try to fetch catalog
    try {
      const { result: catResult } = await client.catalogApi.listCatalog(undefined, 'ITEM');
      const items = catResult.objects || [];
      results.checks.catalog = {
        totalItems: items.length,
        sampleItems: items.slice(0, 3).map((item: any) => ({
          id: item.id,
          name: item.itemData?.name,
          hasVariations: !!item.itemData?.variations?.length
        }))
      };
      results.success = items.length > 0;
    } catch (catError: any) {
      results.checks.catalog = {
        error: catError.message,
        status: catError.statusCode
      };
      results.success = false;
    }

  } catch (initError: any) {
    results.checks.squareClient = {
      error: initError.message
    };
    results.success = false;
  }

  // Summary
  results.summary = {
    allEnvVarsSet: results.checks.env.hasSquareToken && 
                   results.checks.env.hasLocationId && 
                   results.checks.env.hasAppId,
    canConnectToSquare: !!results.checks.catalog?.totalItems,
    productsAvailable: results.checks.catalog?.totalItems > 0
  };

  const status = results.success ? 200 : 500;
  return NextResponse.json(results, { status });
}
