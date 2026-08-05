import { NextResponse } from 'next/server';
import { Client, Environment } from 'square';

const square = new Client({
  environment: Environment.Production,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

export async function GET() {
  try {
    const { result } = await square.locationsApi.listLocations();
    return NextResponse.json(result.locations);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode || 500 }
    );
  }
}