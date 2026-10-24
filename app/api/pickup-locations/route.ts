import { NextResponse } from 'next/server';
import { getPublicPickupLocations } from '@/lib/pickup-locations';

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const locations = await getPublicPickupLocations();
    return NextResponse.json({ success: true, locations }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    // Fail closed: never invent locations, dates or capacity.
    return NextResponse.json({ success: false, locations: [], error: 'Pickup appointments are temporarily unavailable.' }, { status: 503 });
  }
}
