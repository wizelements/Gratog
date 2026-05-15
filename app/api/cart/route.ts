import { NextRequest, NextResponse } from 'next/server';
import { normalizeProduct, validatePreorderMinimum, getCartTotal } from '@/lib/cart-engine';

/**
 * 🛒 Cart API - Server-side validation & sync for client-side cart
 * 
 * Architecture: Client-side cart (localStorage) is source of truth.
 * API validates cart integrity, enforces preorder rules, returns enriched data.
 * 
 * Why not server-side storage?
 * - Vercel serverless = ephemeral memory, carts "disappear" between requests
 * - localStorage persists across sessions, survives refresh
 * - Square checkout happens client-side anyway
 */

/**
 * POST /api/cart - Validate and enrich cart from client
 * 
 * Body: { items: CartItem[], fulfillmentType?: string, marketId?: string }
 * Returns: { valid: boolean, items: CartItem[], totals: object, errors?: string[], preorderValidation?: object }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items = [], fulfillmentType, marketId } = body;
    
    // Normalize and validate each item
    const normalizedItems = [];
    const errors = [];
    
    for (const item of items) {
      try {
        // Re-normalize to ensure all fields are present and valid
        const normalized = normalizeProduct({
          ...item,
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
        });
        normalizedItems.push(normalized);
      } catch (err) {
        errors.push(`Invalid item: ${item.name || item.id} - ${err.message}`);
      }
    }
    
    // Calculate totals with defensive Number() coercion
    const subtotal = normalizedItems.reduce(
      (sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 
      0
    );
    const totalItems = normalizedItems.reduce(
      (sum, item) => sum + (Number(item.quantity) || 1), 
      0
    );
    const marketExclusiveCount = normalizedItems.filter(i => i.marketExclusive).length;
    const hasPreorderItems = normalizedItems.some(i => i.isPreorder);
    
    // Validate preorder rules
    const preorderValidation = validatePreorderMinimum(normalizedItems);
    
    // Validate market-exclusive items for fulfillment type
    let fulfillmentValidation = { valid: true, error: null };
    if (fulfillmentType && marketExclusiveCount > 0) {
      const marketKey = marketId || extractMarketFromFulfillment(fulfillmentType);
      if (['shipping', 'delivery'].includes(marketKey)) {
        const exclusiveNames = normalizedItems
          .filter(i => i.marketExclusive)
          .map(i => i.name)
          .join(', ');
        fulfillmentValidation = {
          valid: false,
          error: `${exclusiveNames} ${marketExclusiveCount > 1 ? 'are' : 'is'} only available for market pickup`
        };
      }
    }
    
    const response = {
      valid: errors.length === 0 && preorderValidation.valid && fulfillmentValidation.valid,
      items: normalizedItems,
      totals: {
        subtotal,
        totalItems,
        itemCount: normalizedItems.length,
        marketExclusiveCount,
        hasPreorderItems,
      },
      errors: errors.length > 0 ? errors : undefined,
      preorderValidation: hasPreorderItems ? {
        valid: preorderValidation.valid,
        error: preorderValidation.error || null,
        ...(preorderValidation.preorderSubtotal !== undefined && {
          preorderSubtotal: preorderValidation.preorderSubtotal,
          minimumRequired: preorderValidation.minimumRequired,
        }),
        ...(preorderValidation.bobaQty !== undefined && {
          bobaQty: preorderValidation.bobaQty,
          bobaMax: preorderValidation.bobaMax,
        }),
      } : undefined,
      fulfillmentValidation: fulfillmentValidation.error ? fulfillmentValidation : undefined,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Cart API error:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate cart', items: [], totals: { subtotal: 0, totalItems: 0, itemCount: 0 } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cart - Returns empty cart structure (client is source of truth)
 * 
 * Use this to initialize cart state on SSR or check API health.
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Client-side cart is source of truth. POST cart items for validation.',
    items: [],
    totals: { subtotal: 0, totalItems: 0, itemCount: 0 },
  });
}

/**
 * DELETE /api/cart - No-op (client clears localStorage)
 * 
 * Included for API completeness, but cart clearing should happen client-side.
 */
export async function DELETE(request: NextRequest) {
  return NextResponse.json({
    message: 'Cart cleared on client. This endpoint is a no-op.',
    success: true,
  });
}

// Helper to extract market key from fulfillment type string
function extractMarketFromFulfillment(fulfillmentType: string): string {
  if (fulfillmentType.includes('dunwoody') || fulfillmentType.includes('browns_mill')) {
    return 'dunwoody';
  }
  if (fulfillmentType.includes('serenbe') || fulfillmentType.includes('meetup')) {
    return 'serenbe';
  }
  if (fulfillmentType.includes('delivery')) {
    return 'delivery';
  }
  if (fulfillmentType.includes('shipping')) {
    return 'shipping';
  }
  return 'serenbe'; // default
}
