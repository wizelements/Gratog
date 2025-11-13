// Authoritative pricing resolver using Square Catalog API

import { getSquareClient } from './square';
import { fromCents } from './money';

/**
 * Get authoritative price from Square Catalog variation
 * @param variationId - Square catalog variation ID
 * @returns Price money object or null if not found
 */
export async function priceFromVariation(variationId: string) {
  try {
    const square = getSquareClient();
    const response = await square.catalogApi.retrieveCatalogObject(variationId, true) as any;
    
    return response.result?.object?.itemVariationData?.priceMoney || null;
  } catch (error) {
    console.error(`Failed to get price for variation ${variationId}:`, error);
    return null;
  }
}

/**
 * Get multiple variation prices in batch
 * @param variationIds - Array of Square catalog variation IDs
 * @returns Map of variation ID to price money object
 */
export async function batchPriceFromVariations(variationIds: string[]) {
  try {
    const square = getSquareClient();
    const response = await square.catalogApi.batchRetrieveCatalogObjects({
      objectIds: variationIds,
      includeRelatedObjects: true
    }) as any;
    
    const priceMap = new Map();
    
    if (response.result?.objects) {
      for (const obj of response.result.objects) {
        if (obj.type === 'ITEM_VARIATION' && obj.itemVariationData?.priceMoney) {
          priceMap.set(obj.id, obj.itemVariationData.priceMoney);
        }
      }
    }
    
    return priceMap;
  } catch (error) {
    console.error('Failed to batch retrieve variation prices:', error);
    return new Map();
  }
}

/**
 * Get inventory count for a variation
 * @param variationId - Square catalog variation ID
 * @param locationId - Square location ID
 * @returns Inventory count or 0 if not found
 */
export async function getInventoryCount(variationId: string, locationId: string): Promise<number> {
  try {
    const square = getSquareClient();
    const response = await (square.inventoryApi as any).batchRetrieveInventoryCounts({
      catalogObjectIds: [variationId],
      locationIds: [locationId]
    });
    
    const count = response.result?.counts?.find((c: any) => 
      c.catalogObjectId === variationId && 
      c.locationId === locationId &&
      c.state === 'IN_STOCK'
    );
    
    return count ? parseInt(count.quantity || '0') : 0;
  } catch (error) {
    console.error(`Failed to get inventory for variation ${variationId}:`, error);
    return 0;
  }
}

/**
 * Calculate order totals using Square Orders API
 * @param lineItems - Array of line items with variation IDs and quantities
 * @param locationId - Square location ID
 * @returns Calculated order with taxes and discounts applied
 */
export async function calculateOrderTotals(lineItems: any[], locationId: string) {
  try {
    const square = getSquareClient();
    // First, get the catalog objects to build proper line items
    const variationIds = lineItems.map(item => item.variationId);
    const catalogResponse = await square.catalogApi.batchRetrieveCatalogObjects({
      objectIds: variationIds,
      includeRelatedObjects: true
    }) as any;
    
    if (!catalogResponse.result?.objects) {
      throw new Error('No catalog objects found');
    }
    
    // Build Square line items
    const squareLineItems = lineItems.map(item => {
      const catalogObj = catalogResponse.result.objects?.find((obj: any) => obj.id === item.variationId);
      
      if (!catalogObj || catalogObj.type !== 'ITEM_VARIATION') {
        throw new Error(`Invalid variation ID: ${item.variationId}`);
      }
      
      return {
        catalogObjectId: item.variationId,
        quantity: String(item.quantity),
        basePriceMoney: catalogObj.itemVariationData?.priceMoney,
        name: catalogObj.itemVariationData?.name || 'Unknown Item'
      };
    });
    
    // Calculate order using Square Orders API
    const orderResponse = await square.ordersApi.calculateOrder({
      order: {
        locationId,
        lineItems: squareLineItems,
        pricingOptions: {
          autoApplyTaxes: true,
          autoApplyDiscounts: true
        }
      }
    }) as any;
    
    return orderResponse.result?.order;
  } catch (error) {
    console.error('Failed to calculate order totals:', error);
    throw error;
  }
}

/**
 * Format line item for display
 * @param lineItem - Square line item
 * @returns Formatted line item with human-readable values
 */
export function formatLineItem(lineItem: any) {
  return {
    name: lineItem.name,
    quantity: parseInt(lineItem.quantity || '1'),
    basePrice: fromCents(lineItem.basePriceMoney),
    totalPrice: fromCents(lineItem.totalMoney),
    variationId: lineItem.catalogObjectId
  };
}

/**
 * Format order for display
 * @param order - Square order object
 * @returns Formatted order with human-readable values
 */
export function formatOrder(order: any) {
  return {
    lineItems: order.lineItems?.map(formatLineItem) || [],
    subtotal: fromCents(order.netAmounts?.totalMoney),
    tax: fromCents(order.totalTaxMoney),
    tip: fromCents(order.totalTipMoney),
    discount: fromCents(order.totalDiscountMoney),
    total: fromCents(order.totalMoney),
    currency: order.totalMoney?.currency || 'USD'
  };
}