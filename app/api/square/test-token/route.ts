import { NextResponse } from 'next/server';

/**
 * Test Square token directly - diagnostic endpoint
 */
export async function GET() {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN?.trim() || '';
  const environment = process.env.SQUARE_ENVIRONMENT?.trim().toLowerCase() || 'sandbox';
  
  const baseUrl = environment === 'production' 
    ? 'https://connect.squareup.com' 
    : 'https://connect.squareupsandbox.com';
  
  if (!accessToken) {
    return NextResponse.json({
      error: 'SQUARE_ACCESS_TOKEN not configured'
    }, { status: 500 });
  }
  
  try {
    const response = await fetch(`${baseUrl}/v2/locations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2025-01-22'
      }
    });
    
    const data = await response.json();
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      config: {
        environment,
        baseUrl,
        tokenPrefix: accessToken.substring(0, 10),
        tokenLength: accessToken.length,
        hasWhitespace: accessToken !== accessToken.trim()
      },
      response: data
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      config: {
        environment,
        tokenPrefix: accessToken.substring(0, 10)
      }
    }, { status: 500 });
  }
}
