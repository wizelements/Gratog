/**
 * Diagnostic API to check Square configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { Client, Environment } from 'square';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    env: {
      hasSquareToken: !!process.env.SQUARE_ACCESS_TOKEN,
      hasLocationId: !!process.env.SQUARE_LOCATION_ID,
      hasAppId: !!process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID,
      squareEnv: process.env.SQUARE_ENVIRONMENT,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    }
  };

  try {
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      diagnostics.error = 'SQUARE_ACCESS_TOKEN not set';
      return NextResponse.json(diagnostics, { status: 500 });
    }

    // Try to initialize Square client
    const client = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: process.env.SQUARE_ENVIRONMENT === 'production' 
        ? Environment.Production 
        : Environment.Sandbox,
    });

    diagnostics.squareClientInitialized = true;

    // Try to fetch locations
    const { result: locationsResult } = await client.locationsApi.listLocations();
    diagnostics.locationsCount = locationsResult.locations?.length || 0;
    diagnostics.locations = locationsResult.locations?.map((l: any) => ({
      id: l.id,
      name: l.name,
      status: l.status
    })) || [];

    // Try to fetch catalog
    const { result: catalogResult } = await client.catalogApi.listCatalog(undefined, 'ITEM');
    diagnostics.catalogItemsCount = catalogResult.objects?.length || 0;
    diagnostics.sampleItems = catalogResult.objects?.slice(0, 3).map((item: any) => ({
      id: item.id,
      name: item.itemData?.name,
      type: item.type
    })) || [];

    diagnostics.success = true;
    return NextResponse.json(diagnostics);

  } catch (error) {
    diagnostics.error = error instanceof Error ? error.message : 'Unknown error';
    diagnostics.stack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(diagnostics, { status: 500 });
  }
}
