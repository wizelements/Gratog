/**
 * Square Orders Sync
 * Syncs orders from Square Orders API to MongoDB orders collection
 * Enables admin dashboard to see all Square orders
 */

import { logger } from '@/lib/logger';

const SQUARE_VERSION = '2025-01-23';
const MAX_LOCATIONS = 10;

function getSquareEnvironment() {
  return (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase() === 'production'
    ? 'production'
    : 'sandbox';
}

function getSquareConfig() {
  const environment = getSquareEnvironment();
  return {
    environment,
    baseUrl: environment === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com',
    token: (process.env.SQUARE_ACCESS_TOKEN || '').trim(),
    locationId: (process.env.SQUARE_LOCATION_ID || '').trim() || null
  };
}
  
function validateSquareToken(token) {
  if (!token) {
    throw new Error('Missing Square configuration: SQUARE_ACCESS_TOKEN is not set');
  }

  if (token.startsWith('sq0csp-')) {
    throw new Error(
      'SQUARE_ACCESS_TOKEN is a Client Secret (sq0csp-). Use a Square Access Token (EAAA... or sq0atp-...) instead.'
    );
  }

  if (token.startsWith('sq0idp-') || token.startsWith('sq0idb-')) {
    throw new Error('SQUARE_ACCESS_TOKEN appears to be an Application ID. Use an Access Token instead.');
  }
}

function parseSquareJson(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    const parseError = new Error('Square API returned a non-JSON response');
    parseError.cause = error;
    parseError.raw = text.slice(0, 200);
    throw parseError;
  }
}

async function squareFetch(config, path, options = {}) {
  const url = `${config.baseUrl}${path}`;
  const headers = {
    'Authorization': `Bearer ${config.token}`,
    'Square-Version': SQUARE_VERSION,
    'Content-Type': 'application/json',
    ...options.headers
  };

  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  const json = parseSquareJson(text);

  if (!response.ok) {
    const error = new Error(json?.errors?.[0]?.detail || `Square API error ${response.status}`);
    error.status = response.status;
    error.errors = json?.errors;
    throw error;
  }
  
  return json;
}

async function getSquareLocationIds(config) {
  const fallbackToAllLocations = async (reason) => {
    logger.warn('OrdersSync', `Configured location unavailable (${reason}). Falling back to active Square locations.`);
    const locationsResponse = await squareFetch(config, '/v2/locations');
    const activeLocations = (locationsResponse.locations || [])
      .filter((location) => (location.status || '').toUpperCase() === 'ACTIVE')
      .map((location) => location.id)
      .filter(Boolean)
      .slice(0, MAX_LOCATIONS);

    if (activeLocations.length === 0) {
      throw new Error('No active Square locations available for order sync');
    }

    return activeLocations;
  };

  if (!config.locationId) {
    return fallbackToAllLocations('SQUARE_LOCATION_ID missing');
  }

  try {
    await squareFetch(config, `/v2/locations/${config.locationId}`);
    return [config.locationId];
  } catch (error) {
    if (error.status === 404 || error.status === 403) {
      return fallbackToAllLocations(`location ${config.locationId} not accessible`);
    }

    throw error;
  }
}

function mapSquareOrderToInternal(order) {
  const totalMoney = order.total_money || order.totalMoney;
  const totalCents = typeof totalMoney?.amount === 'bigint'
    ? Number(totalMoney.amount)
    : (totalMoney?.amount || 0);

  const fulfillments = order.fulfillments || [];
  const fulfillment = fulfillments[0];
  let fulfillmentType = 'pickup';
  let deliveryInfo = null;
  let pickupInfo = null;

  if (fulfillment) {
    const type = (fulfillment.type || '').toUpperCase();
    if (type === 'DELIVERY') {
      fulfillmentType = 'delivery';
      const details = fulfillment.delivery_details || fulfillment.deliveryDetails || {};
      const addr = details.recipient?.address || {};
      deliveryInfo = {
        address: [
          addr.address_line_1 || addr.addressLine1,
          addr.locality,
          addr.administrative_district_level_1 || addr.administrativeDistrictLevel1,
          addr.postal_code || addr.postalCode
        ].filter(Boolean).join(', ') || null,
        zone: null,
        timeSlot: details.deliver_at || details.deliverAt || null
      };
    } else if (type === 'PICKUP') {
      fulfillmentType = 'pickup';
      const details = fulfillment.pickup_details || fulfillment.pickupDetails || {};
      pickupInfo = {
        boothNumber: details.note || null,
        readyTime: details.pickup_at || details.pickupAt || null
      };
    } else if (type === 'SHIPMENT') {
      fulfillmentType = 'delivery';
      const details = fulfillment.shipment_details || fulfillment.shipmentDetails || {};
      const addr = details.recipient?.address || {};
      deliveryInfo = {
        address: [
          addr.address_line_1 || addr.addressLine1,
          addr.locality,
          addr.administrative_district_level_1 || addr.administrativeDistrictLevel1,
          addr.postal_code || addr.postalCode
        ].filter(Boolean).join(', ') || null,
        zone: null,
        timeSlot: null
      };
    }
  }

  const lineItems = order.line_items || order.lineItems || [];
  const items = lineItems.map(li => {
    const basePrice = li.base_price_money || li.basePriceMoney;
    const baseCents = typeof basePrice?.amount === 'bigint'
      ? Number(basePrice.amount)
      : (basePrice?.amount || 0);

    return {
      productName: li.name,
      name: li.name,
      quantity: Number(li.quantity || 1),
      priceAtPurchase: baseCents,
      price: baseCents,
      catalogObjectId: li.catalog_object_id || li.catalogObjectId,
      variationName: li.variation_name || li.variationName
    };
  });

  const state = (order.state || '').toUpperCase();
  let status = 'pending';
  if (state === 'COMPLETED') status = 'delivered';
  else if (state === 'CANCELED') status = 'cancelled';
  else if (state === 'OPEN') status = 'pending';

  const tenders = order.tenders || [];
  const isPaid = tenders.some(t => t.type && t.type !== 'NO_SALE');

  return {
    squareOrderId: order.id,
    orderNumber: order.reference_id || order.referenceId || order.id?.slice(-8),
    total: totalCents,
    items,
    status,
    fulfillmentType,
    deliveryInfo,
    pickupInfo,
    customerName: order.customer_id ? `Customer ${order.customer_id.slice(-6)}` : null,
    customerEmail: null,
    customerPhone: null,
    isPaid,
    paymentStatus: isPaid ? 'paid' : 'pending',
    createdAt: order.created_at ? new Date(order.created_at) : new Date(),
    updatedAt: order.updated_at ? new Date(order.updated_at) : new Date(),
    source: 'square_sync',
    squareData: {
      orderId: order.id,
      locationId: order.location_id || order.locationId,
      state: order.state,
      version: order.version
    }
  };
}

export async function syncSquareOrders(db, options = {}) {
  const { since, limit = 500 } = options;
  const squareConfig = getSquareConfig();

  validateSquareToken(squareConfig.token);
  const locationIds = await getSquareLocationIds(squareConfig);

  logger.info('OrdersSync', `Starting Square orders sync from ${squareConfig.environment} environment (${locationIds.length} location${locationIds.length === 1 ? '' : 's'})`);

  const searchBody = {
    location_ids: locationIds,
    limit: Math.min(limit, 500),
    return_entries: false
  };

  if (since) {
    searchBody.query = {
      filter: {
        date_time_filter: {
          created_at: {
            start_at: since.toISOString()
          }
        }
      }
    };
  }

  let cursor;
  let synced = 0;
  let errors = 0;
  const results = [];

  try {
    do {
      const bodyWithCursor = cursor ? { ...searchBody, cursor } : searchBody;
      
      logger.debug('OrdersSync', `Fetching orders page ${cursor ? '(cursor: ' + cursor.slice(0, 10) + '...)' : '(first page)'}`);
      
      const res = await squareFetch(squareConfig, '/v2/orders/search', {
        method: 'POST',
        body: JSON.stringify(bodyWithCursor)
      });

      const orders = res.orders || [];
      logger.debug('OrdersSync', `Received ${orders.length} orders`);

      for (const sqOrder of orders) {
        try {
          const doc = mapSquareOrderToInternal(sqOrder);
          
          const updateResult = await db.collection('orders').updateOne(
            { squareOrderId: doc.squareOrderId },
            { 
              $set: doc,
              $setOnInsert: { 
                _id: doc.squareOrderId,
                importedAt: new Date()
              }
            },
            { upsert: true }
          );
          
          synced++;
          results.push({
            orderId: doc.squareOrderId,
            orderNumber: doc.orderNumber,
            status: doc.status,
            total: doc.total,
            action: updateResult.upsertedCount > 0 ? 'created' : 'updated'
          });
        } catch (orderError) {
          logger.error('OrdersSync', `Failed to sync order ${sqOrder.id}:`, orderError);
          errors++;
        }
      }

      cursor = res.cursor;
    } while (cursor && synced < limit);

    await db.collection('square_sync_metadata').updateOne(
      { type: 'orders_sync' },
      {
        $set: {
          type: 'orders_sync',
          lastSyncAt: new Date(),
          stats: { synced, errors },
          environment: squareConfig.environment,
          locationIds
        }
      },
      { upsert: true }
    );

    logger.info('OrdersSync', `✅ Square orders sync complete: ${synced} synced, ${errors} errors`);

    return { 
      success: true, 
      synced, 
      errors,
      orders: results.slice(0, 20)
    };

  } catch (error) {
    logger.error('OrdersSync', 'Failed to sync Square orders:', error);
    throw error;
  }
}

export async function getOrdersSyncStatus(db) {
  const syncMeta = await db.collection('square_sync_metadata').findOne({ 
    type: 'orders_sync' 
  });

  const orderCount = await db.collection('orders').countDocuments({ source: 'square_sync' });

  return {
    lastSync: syncMeta?.lastSyncAt || null,
    stats: syncMeta?.stats || {},
    orderCount,
    environment: syncMeta?.environment || getSquareEnvironment()
  };
}
