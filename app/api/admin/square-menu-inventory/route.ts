import { NextResponse } from 'next/server';
import { withAdminMiddleware } from '@/lib/middleware/admin';
import { PERMISSIONS } from '@/lib/security';
import { readApprovedSquareMenuStock } from '@/lib/square-menu-stock';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Merchant-only live Square variation readback; never modifies counts. */
export const GET = withAdminMiddleware(async () => {
  try {
    const result = await readApprovedSquareMenuStock();
    return NextResponse.json({success:true, ...result}, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return NextResponse.json({success:false,code:'SQUARE_READBACK_FAILED',
      error:'Could not verify current Square catalog and inventory.'},
      {status:502,headers:{'Cache-Control':'private, no-store'}});
  }
}, {permission:PERMISSIONS.INVENTORY_VIEW,resource:'square_inventory_readback',action:'view'});
