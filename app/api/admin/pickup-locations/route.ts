import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { requireAdminSession } from '@/lib/auth/unified-admin';
import { getPickupLocationsAdmin, pickupLocationSchema, savePickupLocation } from '@/lib/pickup-locations';

export const dynamic = 'force-dynamic';
async function authorize(request: NextRequest) {
  const session = await requireAdminSession(request);
  if (!session) return false;
  try { await requireAdmin(request); return true; } catch { return false; }
}

export async function GET(request: NextRequest) {
  if (!(await authorize(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { return NextResponse.json({ success: true, locations: await getPickupLocationsAdmin() }); }
  catch { return NextResponse.json({ success: false, error: 'Unable to load pickup locations' }, { status: 503 }); }
}

async function save(request: NextRequest, updating: boolean) {
  if (!(await authorize(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const result = pickupLocationSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: 'Invalid pickup settings', details: result.error.flatten() }, { status: 400 });
    if (updating && typeof body.id !== 'string') return NextResponse.json({ error: 'Location ID required' }, { status: 400 });
    const id = await savePickupLocation(result.data, updating ? body.id : undefined);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to save location' }, { status: 500 });
  }
}
export const POST = (request: NextRequest) => save(request, false);
export const PUT = (request: NextRequest) => save(request, true);
