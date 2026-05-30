/**
 * Diagnostic API to check Square configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { SquareClient as Client, SquareEnvironment as Environment } from 'square';

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
      token: process.env.SQUARE_ACCESS_TOKEN,
      environment: process.env.SQUARE_ENVIRONMENT === 'production' 
        ? Environment.Production 
        : Environment.Sandbox,
    });

    diagnostics.squareClientInitialized = true;

    // Try to fetch locations
    const locationsResult = await client.locations.list();
    const locationsList = (locationsResult as any).data || (locationsResult as any).result?.locations || [];
    diagnostics.locationsCount = locationsList.length;
    diagnostics.locations = locationsList.map((l: any) => ({
      id: l.id,
      name: l.name,
      status: l.status
    }));

    // Try to fetch catalog
    const catalogResult = await client.catalog.list({ types: 'ITEM' } as any);
    const catalogList = (catalogResult as any).data || (catalogResult as any).result?.objects || [];
    diagnostics.catalogItemsCount = catalogList.length;
    diagnostics.sampleItems = catalogList.slice(0, 3).map((item: any) => ({
      id: item.id,
      name: item.itemData?.name,
      type: item.type
    }));

    diagnostics.success = true;
    return NextResponse.json(diagnostics);

  } catch (error) {
    diagnostics.error = error instanceof Error ? error.message : 'Unknown error';
    diagnostics.stack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(diagnostics, { status: 500 });
  }
}
