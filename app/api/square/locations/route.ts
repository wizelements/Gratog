import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { Client, Environment } = await import('square');
    const square = new Client({
      environment: Environment.Production,
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
    });
    const { result } = await square.locationsApi.listLocations();
    return NextResponse.json(result.locations);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode || 500 }
    );
  }
}