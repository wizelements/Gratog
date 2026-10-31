import { NextResponse } from 'next/server';
import { withAdminMiddleware } from '@/lib/middleware/admin';
import { PERMISSIONS } from '@/lib/security';
import { readApprovedSquareMenuStock } from '@/lib/square-menu-stock';
import merchantRecount from '@/ops/reconciliation/2026-10-31-merchant-bottle-counts.json';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Merchant-only live Square variation readback; never modifies counts. */
export const GET = withAdminMiddleware(async () => {
  try {
    const result = await readApprovedSquareMenuStock();
    // Read-only comparison to a dated, owner-reported bottle count. This is
    // NOT Square-verified inventory, is not refreshed automatically, and
    // must never be consumed by cart admission or payments.
    const reported = new Map(merchantRecount.items.map((item) => [item.slug, item.reportedQuantity]));
    const comparison = result.report.map((item) => {
      const merchantReportedQuantity = reported.get(item.slug) ?? null;
      // Square negative or unknown quantities are not valid live stock.
      const squareVerifiedQuantity = item.status === 'found' && item.countStatus === 'reported'
        ? item.onHand : null;
      return {
        slug: item.slug,
        name: item.name,
        merchantReportedQuantity,
        squareVerifiedQuantity,
        squareMinusMerchant: merchantReportedQuantity !== null && squareVerifiedQuantity !== null
          ? squareVerifiedQuantity - merchantReportedQuantity : null,
        requiresReconciliation: merchantReportedQuantity !== null && (
          squareVerifiedQuantity === null || squareVerifiedQuantity !== merchantReportedQuantity),
        countSource: 'merchant_reported_unverified_square',
      };
    });
    return NextResponse.json({success:true, ...result, merchantRecount: {
      recordedDate: merchantRecount.recordedDate,
      source: merchantRecount.source,
      verificationStatus: merchantRecount.verificationStatus,
      checkoutAuthorization: false,
      caution: merchantRecount.caution,
      comparison,
    }}, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return NextResponse.json({success:false,code:'SQUARE_READBACK_FAILED',
      error:'Could not verify current Square catalog and inventory.'},
      {status:502,headers:{'Cache-Control':'private, no-store'}});
  }
}, {permission:PERMISSIONS.INVENTORY_VIEW,resource:'square_inventory_readback',action:'view'});
