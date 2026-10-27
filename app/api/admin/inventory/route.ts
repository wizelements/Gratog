export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { PERMISSIONS } from '@/lib/security';
import { withAdminMiddleware } from '@/lib/middleware/admin';
import { openTursoPreview, tursoPreviewSelected } from '@/lib/checkout/turso-preview-runtime.mjs';
import { listTursoInventory } from '@/lib/inventory/turso-inventory.mjs';

export const GET = withAdminMiddleware(async () => {
  try {
    if (tursoPreviewSelected()) {
      const products = await listTursoInventory(await openTursoPreview());
      return NextResponse.json({ success: true, products, source: 'turso' },
        { headers: { 'Cache-Control': 'no-store' } });
    }
    const { db } = await connectToDatabase();
    const [inventory, products] = await Promise.all([
      db.collection('inventory').find({}).toArray(),
      db.collection('unified_products').find({}).project({id:1,name:1,images:1}).toArray(),
    ]);
    const byId = new Map<string, any>(products.map((product: any) => [product.id, product]));
    return NextResponse.json({ success: true, source: 'mongodb', products: inventory.map((item: any) => {
      const product = byId.get(item.productId);
      return { ...item, id: item.productId, name: product?.name || item.productName || item.productId,
        stock: item.currentStock, image: product?.images?.[0] || '/images/sea-moss-default.svg' };
    }) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ success: false, error: 'Inventory could not be read' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}, { permission: PERMISSIONS.INVENTORY_VIEW, resource: 'inventory', action: 'view' });
