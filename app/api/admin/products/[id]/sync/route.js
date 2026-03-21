import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { requireAdmin } from '@/lib/admin-session';
import { Client, Environment } from 'square';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/products/[id]/sync
 * Sync product changes to/from Square
 */
export async function POST(request, { params }) {
  try {
    const admin = await requireAdmin(request);

    const { db } = await connectToDatabase();
    const { id: productId } = await params;
    const { updates, direction } = await request.json();

    // Initialize Square client
    const client = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: process.env.SQUARE_ENVIRONMENT === 'production' 
        ? Environment.Production 
        : Environment.Sandbox,
    });

    logger.info('API', `Product sync initiated by ${admin.email}: ${productId} ${direction}`);

    if (direction === 'to_square') {
      return await syncToSquare(db, client, productId, updates, admin);
    } else if (direction === 'from_square') {
      return await syncFromSquare(db, client, productId, admin);
    }

    return NextResponse.json(
      { success: false, error: 'Invalid sync direction' },
      { status: 400 }
    );
  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('API', 'Sync error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}

/**
 * Sync changes TO Square Catalog API
 */
async function syncToSquare(db, client, productId, updates, admin) {
  try {
    // Get current product from Square
    const { result: catalogObject } = await client.catalogApi.retrieveCatalogObject(productId);
    
    if (!catalogObject?.object) {
      throw new Error('Product not found in Square');
    }

    const squareProduct = catalogObject.object;

    // Build update object
    const updatedObject = {
      type: 'ITEM',
      id: productId,
      version: squareProduct.version,
      itemData: {
        ...squareProduct.itemData,
        name: updates.name || squareProduct.itemData.name,
        description: updates.description || squareProduct.itemData.description,
      }
    };

    // Update in Square
    const { result } = await client.catalogApi.upsertCatalogObject({
      idempotencyKey: `admin-update-${productId}-${Date.now()}`,
      object: updatedObject
    });

    // Update local database
    await db.collection('unified_products').updateOne(
      { id: productId },
      {
        $set: {
          ...updates,
          syncedAt: new Date(),
          syncedBy: admin.email,
          source: 'admin_to_square',
          squareVersion: result.catalogObject.version
        }
      }
    );

    await db.collection('square_catalog_items').updateOne(
      { id: productId },
      {
        $set: {
          name: updates.name,
          description: updates.description,
          updatedAt: new Date(),
          squareVersion: result.catalogObject.version
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Successfully synced to Square',
      squareVersion: result.catalogObject.version
    });
  } catch (error) {
    logger.error('API', 'Square sync error:', error);
    throw error;
  }
}

/**
 * Sync latest data FROM Square Catalog API
 */
async function syncFromSquare(db, client, productId, admin) {
  try {
    // Get latest from Square
    const { result } = await client.catalogApi.retrieveCatalogObject(productId);
    
    if (!result?.object) {
      throw new Error('Product not found in Square');
    }

    const squareProduct = result.object;
    const itemData = squareProduct.itemData;

    // Update local databases
    await db.collection('square_catalog_items').updateOne(
      { id: productId },
      {
        $set: {
          name: itemData.name,
          description: itemData.description,
          categoryId: itemData.categoryId,
          updatedAt: new Date(),
          squareUpdatedAt: squareProduct.updatedAt,
          squareVersion: squareProduct.version
        }
      },
      { upsert: true }
    );

    await db.collection('unified_products').updateOne(
      { id: productId },
      {
        $set: {
          name: itemData.name,
          description: itemData.description,
          syncedAt: new Date(),
          syncedBy: admin.email,
          source: 'square_pull',
          squareVersion: squareProduct.version
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Successfully synced from Square',
      product: {
        name: itemData.name,
        description: itemData.description
      }
    });
  } catch (error) {
    logger.error('API', 'Square pull error:', error);
    throw error;
  }
}
