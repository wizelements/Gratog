export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { PERMISSIONS } from '@/lib/security';
import { withAdminMiddleware } from '@/lib/middleware/admin';
import {
  CAPACITY_COLLECTION, RECIPE_COLLECTION, capacityKey, CapacityError,
  assertSafeCapacityLimit, expandCapacityDemand,
} from '@/lib/preorder/capacity';

function failure(error: unknown) {
  if (error instanceof CapacityError) {
    return NextResponse.json({ success: false, code: error.code, error: error.message }, { status: error.status });
  }
  return NextResponse.json({ success: false, error: 'Unable to manage preorder capacity' }, { status: 500 });
}

const ID = /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const GET = withAdminMiddleware(async (request) => {
  try {
    const params = new URL(request.url).searchParams;
    const marketId = params.get('marketId') || '';
    const dateKey = params.get('dateKey') || '';
    if (!ID.test(marketId) || !DAY.test(dateKey)) {
      return NextResponse.json({ error: 'Choose a market and YYYY-MM-DD pickup date' }, { status: 400 });
    }
    const { db } = await connectToDatabase();
    const rows = await db.collection(CAPACITY_COLLECTION)
      .find({ marketId, dateKey })
      .project({ _id: 0, sku: 1, limitUnits: 1, heldUnits: 1, active: 1, updatedAt: 1 })
      .sort({ sku: 1 }).limit(250).toArray();
    // Operational visibility must not imply the feature is selling inventory.
    // Independently inspect the actual Mongo index; a declaration in source
    // control does not prove it exists on production or is truly unique.
    const existingIndexes = await db.collection('marketorders').listIndexes().toArray();
    const checkoutIndexReady = existingIndexes.some((index: any) =>
      index.name === 'idx_marketorders_checkout_request' &&
      index.unique === true &&
      index.key?.checkoutRequestId === 1 &&
      index.partialFilterExpression?.checkoutRequestId?.$type === 'string');
    const slot = rows.find((row: any) => row.sku === 'preorder_slot');
    const enabledSkus = rows.filter((row: any) =>
      row.sku !== 'preorder_slot' && row.active === true &&
      Number(row.limitUnits) > Number(row.heldUnits)).length;
    const engineEnabled = process.env.PREORDER_CAPACITY_ENGINE_ENABLED === 'true';
    const readiness = {
      engineEnabled, checkoutIndexReady,
      preparationCapacityConfigured: Boolean(slot?.active && slot?.limitUnits > slot?.heldUnits),
      productCapacitiesConfigured: enabledSkus > 0,
      configuredSkuCount: enabledSkus,
      // Inventory and Square reconciliation are separate required production
      // signoffs, not determinable from a static index and env key check.
      acceptingCapacityBoundPreorders: engineEnabled && checkoutIndexReady &&
        Boolean(slot?.active && slot?.limitUnits > slot?.heldUnits) && enabledSkus > 0,
    };
    return NextResponse.json({
      success: true,
      marketId, dateKey, readiness,
      rows: rows.map((row: any) => ({ ...row, remainingUnits: row.active
        ? Math.max(0, Number(row.limitUnits) - Number(row.heldUnits)) : 0 })),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return failure(error); }
}, { permission: PERMISSIONS.INVENTORY_VIEW, resource: 'preorder_capacity', action: 'view' });

export const PUT = withAdminMiddleware(async (request) => {
  try {
    const data = await request.json();
    if (!ID.test(data?.marketId || '') || !DAY.test(data?.dateKey || '') || !ID.test(data?.sku || '')) {
      return NextResponse.json({ error: 'Market, pickup date, and product SKU are required' }, { status: 400 });
    }
    assertSafeCapacityLimit(data.limitUnits, 0);
    if (typeof data.active !== 'boolean') {
      return NextResponse.json({ error: 'Active must be true or false' }, { status: 400 });
    }
    const { db } = await connectToDatabase();
    const _id = capacityKey(data.marketId, data.dateKey, data.sku);
    const now = new Date();
    // Conditional update prevents an admin from lowering limits below stock
    // already allocated by concurrent checkouts. Absence means no capacity;
    // no synthetic default counts.
    const updated = await db.collection(CAPACITY_COLLECTION).findOneAndUpdate(
      { _id, heldUnits: { $lte: data.limitUnits } },
      { $set: { limitUnits: data.limitUnits, active: data.active, updatedAt: now } },
      { returnDocument: 'after' }
    );
    if (updated) {
      return NextResponse.json({ success: true, sku: data.sku, limitUnits: updated.limitUnits, heldUnits: updated.heldUnits });
    }
    try {
      await db.collection(CAPACITY_COLLECTION).insertOne({
        _id, marketId: data.marketId, dateKey: data.dateKey, sku: data.sku,
        limitUnits: data.limitUnits, heldUnits: 0,
        active: data.active, createdAt: now, updatedAt: now,
      });
      return NextResponse.json({ success: true, sku: data.sku, limitUnits: data.limitUnits, heldUnits: 0 }, { status: 201 });
    } catch (error: any) {
      if (error?.code === 11000) throw new CapacityError('CAPACITY_BELOW_HELD',
        'Concurrent reservations prevent reducing this limit; reload and review committed units');
      throw error;
    }
  } catch (error) { return failure(error); }
}, { permission: PERMISSIONS.INVENTORY_ADJUST, resource: 'preorder_capacity', action: 'update' });

/**
 * Merchant-approved bundle recipes: a bundle reserves ingredient/product
 * components as a group, never just a virtual bundle's own SKU.
 */
export const POST = withAdminMiddleware(async (request) => {
  try {
    const data = await request.json();
    if (!ID.test(data?.sku || '') || typeof data.active !== 'boolean' ||
        !Array.isArray(data.components) || data.components.length < 1 || data.components.length > 30) {
      return NextResponse.json({ error: 'Invalid bundle recipe' }, { status: 400 });
    }
    const components = expandCapacityDemand(data.components.map((line: any) => ({
      sku: line.sku, quantity: line.quantity, isBundle: false,
    })));
    if (components.some(entry => entry.sku === data.sku)) {
      return NextResponse.json({ error: 'A bundle cannot contain itself' }, { status: 400 });
    }
    const { db } = await connectToDatabase();
    const now = new Date();
    await db.collection(RECIPE_COLLECTION).updateOne(
      { _id: data.sku },
      { $set: { components, active: data.active, updatedAt: now },
        $setOnInsert: { createdAt: now } },
      { upsert: true }
    );
    return NextResponse.json({ success: true, sku: data.sku, components });
  } catch (error) { return failure(error); }
}, { permission: PERMISSIONS.INVENTORY_ADJUST, resource: 'preorder_bundle_recipes', action: 'update' });
