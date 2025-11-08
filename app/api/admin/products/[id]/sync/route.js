import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { verifyToken } from '@/lib/auth';
import { Client, Environment } from 'square';

/**
 * POST /api/admin/products/[id]/sync
 * Sync product changes to/from Square
 */
export async function POST(request, { params }) {
  const token = request.cookies.get('admin_token')?.value;
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const { db } = await connectToDatabase();
    const productId = params.id;
    const { updates, direction } = await request.json();

    // Initialize Square client
    const client = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: process.env.SQUARE_ENVIRONMENT === 'production' 
        ? Environment.Production 
        : Environment.Sandbox,
    });

    if (direction === 'to_square') {
      // Push changes TO Square
      return await syncToSquare(db, client, productId, updates);
    } else if (direction === 'from_square') {
      // Pull latest FROM Square
      return await syncFromSquare(db, client, productId);
    }

    return NextResponse.json(
      { success: false, error: 'Invalid sync direction' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}

/**
 * Sync changes TO Square Catalog API
 */
async function syncToSquare(db, client, productId, updates) {
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
    console.error('Square sync error:', error);
    throw error;
  }
}

/**
 * Sync latest data FROM Square Catalog API
 */
async function syncFromSquare(db, client, productId) {
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
    console.error('Square pull error:', error);
    throw error;
  }
}
