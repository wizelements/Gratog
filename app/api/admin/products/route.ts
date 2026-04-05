import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { PERMISSIONS } from '@/lib/security';
import { withAdminMiddleware, AuthenticatedRequest } from '@/lib/middleware/admin';
import { ProductUpdateSchema, validateBody } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { revalidatePath } from 'next/cache';

/**
 * GET /api/admin/products
 * Fetch all products for admin dashboard
 * 
 * Supports:
 * - Pagination: ?page=1&limit=50
 * - Search: ?search=product-name
 * - Category filter: ?category=sea-moss
 * - Stock status: ?stockStatus=in_stock|low_stock|out_of_stock
 */
export const GET = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const search = searchParams.get('search')?.trim();
    const category = searchParams.get('category')?.trim();
    const stockStatus = searchParams.get('stockStatus')?.trim();
    const skip = (page - 1) * limit;
    
    try {
      const { db } = await connectToDatabase();
      
      // Build query
      const query: Record<string, unknown> = {};
      
      if (search) {
        // Safe text search with escaped regex
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
          { name: { $regex: escapedSearch, $options: 'i' } },
          { description: { $regex: escapedSearch, $options: 'i' } },
        ];
      }
      
      if (category) {
        // Whitelist allowed categories
        const allowedCategories = [
          'Sea Moss Gels',
          'Lemonades & Juices',
          'Wellness Shots',
          'Herbal Blends & Teas',
          'Bundles & Seasonal',
        ];
        if (allowedCategories.includes(category)) {
          query.intelligentCategory = category;
        }
      }
      
      // Fetch products from unified collection
      let products = await db.collection('unified_products')
        .find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      
      // Fallback to square_catalog_items if unified is empty
      if (products.length === 0 && !search && !category) {
        logger.info('API', 'unified_products empty, falling back to square_catalog_items');
        products = await db.collection('square_catalog_items')
          .find(query)
          .sort({ name: 1 })
          .skip(skip)
          .limit(limit)
          .toArray();
      }
      
      // Get inventory data for all products
      const productIds = products.map(p => p.id);
      const inventory = await db.collection('inventory')
        .find({ productId: { $in: productIds } })
        .toArray();
      
      // Create map for O(1) inventory lookup
      const inventoryMap = new Map(
        inventory.map(item => [item.productId, item])
      );
      
      // Transform to admin format with inventory data
      const adminProducts = products.map(product => {
        const inv = inventoryMap.get(product.id) as { 
          currentStock?: number; 
          lowStockThreshold?: number; 
          lastRestocked?: string | null 
        } | undefined;
        
        // Determine stock status
        let stockStatus = 'in_stock';
        if (inv?.currentStock === 0) {
          stockStatus = 'out_of_stock';
        } else if (inv?.currentStock <= (inv?.lowStockThreshold || 5)) {
          stockStatus = 'low_stock';
        }
        
        return {
          id: product.id,
          name: product.name || 'Unnamed Product',
          description: product.description || '',
          category: product.intelligentCategory || product.category || 'uncategorized',
          price: product.price || 0,
          variations: product.variations || [],
          images: product.images || [],
          image: product.images?.[0] || product.image || '/images/sea-moss-default.svg',
          inStock: product.inStock !== false,
          active: true,
          subtitle: product.benefitStory || (product.description ? product.description.substring(0, 100) : '') || 'Premium sea moss product',
          featured: product.featured || false,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          // Inventory data
          stock: inv?.currentStock || 0,
          lowStockThreshold: inv?.lowStockThreshold || 5,
          lastRestocked: inv?.lastRestocked || null,
          stockStatus,
          // Sync status
          syncedAt: product.syncedAt || null,
          manualCategoryOverride: product.manualCategoryOverride || false,
        };
      });
      
      // Filter by stock status if requested
      let filteredProducts = adminProducts;
      if (stockStatus) {
        const allowedStatuses = ['in_stock', 'low_stock', 'out_of_stock'];
        if (allowedStatuses.includes(stockStatus)) {
          filteredProducts = adminProducts.filter(p => p.stockStatus === stockStatus);
        }
      }
      
      // Get total count for pagination
      const totalCount = await db.collection('unified_products').countDocuments(query);
      
      return NextResponse.json({
        success: true,
        products: filteredProducts,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      });
      
    } catch (error) {
      logger.error('API', 'Failed to fetch products', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch products' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.PRODUCTS_VIEW,
    resource: 'products',
    action: 'list',
  }
);

/**
 * PUT /api/admin/products
 * Bulk update products
 * 
 * SECURITY: Strict validation - only whitelisted fields can be updated
 */
export const PUT = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    const admin = request.admin;
    
    try {
      const body = await request.json();
      const { productId, updates } = body;
      
      // Validate productId
      if (!productId || typeof productId !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Product ID is required' },
          { status: 400 }
        );
      }
      
      // Validate updates with Zod schema
      const validation = validateBody(updates, ProductUpdateSchema);
      
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: (validation as { success: false; error: string }).error },
          { status: 400 }
        );
      }
      
      const sanitizedUpdates = validation.data;
      
      // Reject if no valid updates
      if (Object.keys(sanitizedUpdates).length === 0) {
        return NextResponse.json(
          { success: false, error: 'No valid fields to update' },
          { status: 400 }
        );
      }
      
      const { db } = await connectToDatabase();
      
      // Prepare update object with metadata
      const updateData: Record<string, unknown> = {
        ...sanitizedUpdates,
        updatedAt: new Date(),
        updatedBy: admin.email,
        source: 'admin_update',
      };
      
      // Handle manual category override
      if (sanitizedUpdates.category) {
        updateData.intelligentCategory = sanitizedUpdates.category;
        updateData.manualCategoryOverride = true;
        delete updateData.category; // Don't store redundant field
      }
      
      // Update unified_products (canonical source)
      const result = await db.collection('unified_products').updateOne(
        { id: productId },
        { $set: updateData }
      );
      
      if (result.matchedCount === 0) {
        return NextResponse.json(
          { success: false, error: 'Product not found' },
          { status: 404 }
        );
      }
      
      // Also update square_catalog_items for consistency
      const squareUpdate: Record<string, unknown> = {};
      if (sanitizedUpdates.name) squareUpdate.name = sanitizedUpdates.name;
      if (sanitizedUpdates.description) squareUpdate.description = sanitizedUpdates.description;
      if (sanitizedUpdates.price) squareUpdate.price = sanitizedUpdates.price;
      if (sanitizedUpdates.inStock !== undefined) squareUpdate.inStock = sanitizedUpdates.inStock;
      
      if (Object.keys(squareUpdate).length > 0) {
        squareUpdate.updatedAt = new Date();
        await db.collection('square_catalog_items').updateOne(
          { id: productId },
          { $set: squareUpdate }
        );
      }
      
      // Revalidate storefront
      try {
        revalidatePath('/catalog');
        revalidatePath('/');
      } catch (revalError) {
        logger.warn('API', 'Revalidation failed (non-critical)', revalError);
      }
      
      logger.info('API', `Product ${productId} updated by ${admin.email}`, {
        fields: Object.keys(sanitizedUpdates),
      });
      
      return NextResponse.json({
        success: true,
        message: 'Product updated successfully',
        updatedFields: Object.keys(sanitizedUpdates),
      });
      
    } catch (error) {
      logger.error('API', 'Failed to update product', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update product' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.PRODUCTS_UPDATE,
    resource: 'products',
    action: 'update',
    rateLimit: { maxRequests: 60, windowSeconds: 60 },
  }
);

/**
 * POST /api/admin/products
 * Create a new product
 */
export async function POST(request: Request) {
  // Will be implemented with proper middleware
  return NextResponse.json(
    { success: false, error: 'Not implemented' },
    { status: 501 }
  );
}

/**
 * DELETE /api/admin/products
 * Bulk delete products
 */
export async function DELETE(request: Request) {
  return NextResponse.json(
    { success: false, error: 'Not implemented' },
    { status: 501 }
  );
}
