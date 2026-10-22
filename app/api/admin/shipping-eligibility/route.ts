import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { requireAdminSession } from '@/lib/auth/unified-admin';
import { connectToDatabase } from '@/lib/db-optimized';
import { z } from 'zod';
export const dynamic = 'force-dynamic';

async function admin(request: NextRequest) {
  if (!(await requireAdminSession(request))) return null;
  try { return await requireAdmin(request); } catch { return null; }
}

export async function GET(request: NextRequest) {
  if (!(await admin(request))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const { db } = await connectToDatabase();
    const rows = await db.collection('unified_products').find({}).project({
      _id: 0, id: 1, name: 1, shippingEligible: 1, shippingTemperatureClass: 1,
      shippingApprovalNote: 1, shippingApprovedAt: 1,
    }).sort({ name: 1 }).limit(300).toArray();
    return NextResponse.json({ success: true, products: rows }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ success: false, error: 'Catalog unavailable' }, { status: 503 });
  }
}

const input = z.object({
  productId: z.string().min(1).max(200),
  approved: z.boolean(),
  complianceConfirmed: z.boolean().optional(),
  packagingConfirmed: z.boolean().optional(),
  foodSafetyConfirmed: z.boolean().optional(),
  notes: z.string().max(600).default(''),
});

export async function PUT(request: NextRequest) {
  const owner = await admin(request);
  if (!owner) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid approval information' }, { status: 400 });
    const { productId, approved, complianceConfirmed, packagingConfirmed, foodSafetyConfirmed, notes } = parsed.data;
    if (approved && (!complianceConfirmed || !packagingConfirmed || !foodSafetyConfirmed || notes.trim().length < 10)) {
      return NextResponse.json({
        success: false,
        error: 'To approve parcel shipping, confirm regulatory requirements, validated packaging, food safety, and provide the verification reference.',
      }, { status: 422 });
    }
    const { db } = await connectToDatabase();
    const result = await db.collection('unified_products').updateOne({ id: productId }, { $set: {
      shippingEligible: approved,
      shippingTemperatureClass: approved ? 'ambient' : null,
      shippingApprovalNote: approved ? notes.trim() : '',
      shippingApprovedBy: owner.email,
      shippingApprovedAt: new Date(),
      updatedAt: new Date(),
    } });
    if (!result.matchedCount) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    return NextResponse.json({ success: true, productId, approved });
  } catch {
    return NextResponse.json({ success: false, error: 'Unable to update shipping approval' }, { status: 500 });
  }
}
