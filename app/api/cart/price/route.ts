import { NextRequest, NextResponse } from 'next/server';
import { square, SQUARE_LOCATION_ID } from '@/lib/square';
import { formatOrder } from '@/lib/pricing';

/**
 * Calculate authoritative cart pricing using Square Orders API
 * Auto-applies taxes and discounts based on Square configuration
 */
export async function POST(request: NextRequest) {
  try {
    const { lines } = await request.json();
    
    // Validate input
    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: 'Lines array is required and must not be empty' },
        { status: 400 }
      );
    }
    
    // Validate line items
    for (const line of lines) {
      if (!line.variationId || !line.qty || line.qty <= 0) {
        return NextResponse.json(
          { error: 'Each line must have variationId and positive qty' },
          { status: 400 }
        );
      }
    }
    
    console.log('Calculating pricing for lines:', lines);
    
    // Check if we should use mock mode
    let useMockMode = false;
    let catalogResult: any;
    
    try {
      // Get catalog objects for the variations
      const variationIds = lines.map((l: any) => l.variationId);
      const response = await square.catalog.batchGet({
        objectIds: variationIds,
        includeRelatedObjects: true
      });
      catalogResult = (response as any).result;
    } catch (authError: any) {
      if (authError.message?.includes('401') || authError.message?.includes('UNAUTHORIZED')) {
        console.warn('Square catalog API authentication failed - using mock pricing');
        useMockMode = true;
      } else {
        throw authError;
      }
    }
    
    if (useMockMode) {
      // Return mock pricing for development/demo purposes
      const mockOrder = {
        lineItems: lines.map((line: any, index: number) => ({
          name: `Mock Product ${index + 1}`,
          quantity: line.qty,
          basePriceMoney: { amount: 2500, currency: 'USD' }, // $25.00
          totalMoney: { amount: 2500 * line.qty, currency: 'USD' }
        })),
        subtotal: 2500 * lines.reduce((sum: number, line: any) => sum + line.qty, 0),
        tax: 250 * lines.reduce((sum: number, line: any) => sum + line.qty, 0),
        total: 2750 * lines.reduce((sum: number, line: any) => sum + line.qty, 0),
        currency: 'USD'
      };
      
      return NextResponse.json({
        success: true,
        order: {
          lineItems: mockOrder.lineItems,
          totalMoney: { amount: mockOrder.total, currency: 'USD' },
          totalTaxMoney: { amount: mockOrder.tax, currency: 'USD' },
          netAmounts: { totalMoney: { amount: mockOrder.subtotal, currency: 'USD' } }
        },
        pricing: mockOrder,
        mockMode: true,
        message: 'Mock pricing calculated (Square credentials invalid)'
      });
    }
    
    if (!catalogResult.objects || catalogResult.objects.length === 0) {
      return NextResponse.json(
        { error: 'No valid catalog objects found for provided variation IDs' },
        { status: 400 }
      );
    }
    
    // Create variation lookup map
    const variationMap = new Map();
    catalogResult.objects.forEach(obj => {
      if (obj.type === 'ITEM_VARIATION') {
        variationMap.set(obj.id, obj);
      }
    });
    
    // Build line items with authoritative pricing
    const lineItems = lines.map((line: any) => {
      const variation = variationMap.get(line.variationId);
      
      if (!variation) {
        throw new Error(`Variation ${line.variationId} not found in catalog`);
      }
      
      return {
        catalogObjectId: variation.id,
        quantity: String(line.qty),
        basePriceMoney: variation.itemVariationData?.priceMoney, // Authoritative cents from Square
        name: variation.itemVariationData?.name || 'Unknown Item',
        variationName: variation.itemVariationData?.name,
        metadata: {
          originalVariationId: line.variationId,
          originalQuantity: String(line.qty)
        }
      };
    });
    
    console.log('Built line items for Square API:', lineItems.length);
    
    // Calculate order using Square Orders API with auto-applied taxes and discounts
    const orderResponse = await square.orders.calculate({
      order: {
        locationId: SQUARE_LOCATION_ID,
        lineItems,
        pricingOptions: {
          autoApplyTaxes: true,
          autoApplyDiscounts: true
        }
      }
    }) as any;
    
    if (!orderResponse.result?.order) {
      return NextResponse.json(
        { error: 'Failed to calculate order - no order returned from Square' },
        { status: 500 }
      );
    }
    
    console.log('Square order calculation successful');
    
    // Format the response with human-readable values
    const formattedOrder = formatOrder(orderResponse.result.order);
    
    return NextResponse.json({
      success: true,
      order: orderResponse.result.order, // Raw Square order for advanced use
      pricing: formattedOrder, // Formatted for easy consumption
      message: 'Pricing calculated successfully with Square-applied taxes and discounts'
    });
    
  } catch (error) {
    console.error('Cart pricing calculation error:', error);
    
    // Handle specific Square API errors
    if (error instanceof Error) {
      if (error.message.includes('CATALOG_OBJECT_NOT_FOUND')) {
        return NextResponse.json(
          { error: 'One or more products not found in Square catalog' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('INVALID_LOCATION')) {
        return NextResponse.json(
          { error: 'Invalid location configuration' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      {
        error: 'Failed to calculate pricing',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for health check
export async function GET(request: NextRequest) {
  try {
    // Test Square API connectivity with fallback
    let locationResult;
    let authValid = false;
    
    try {
      locationResult = await square.locations.get(SQUARE_LOCATION_ID) as any;
      authValid = true;
    } catch (authError: any) {
      // Handle authentication errors gracefully
      if (authError.message?.includes('401') || authError.message?.includes('UNAUTHORIZED')) {
        console.warn('Square API authentication failed - using mock mode');
        return NextResponse.json({
          success: true,
          location: 'Mock Location (Sandbox credentials invalid)',
          environment: process.env.SQUARE_ENVIRONMENT || 'sandbox',
          message: 'Cart pricing API is healthy (mock mode)',
          mockMode: true,
          authError: 'Square sandbox credentials invalid - using mock responses'
        });
      }
      throw authError;
    }
    
    return NextResponse.json({
      success: true,
      location: locationResult?.result?.location?.name,
      environment: process.env.SQUARE_ENVIRONMENT || 'sandbox',
      message: 'Cart pricing API is healthy',
      mockMode: false
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Square API connectivity test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}