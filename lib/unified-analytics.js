/** @deprecated Prefer lib/analytics.ts; retained for compatible event ingestion. */
import {randomUUID} from 'node:crypto';
import {getTursoConnection} from './db/turso';
import {logger} from '@/lib/logger';

export const EVENT_TYPES={PRODUCT_VIEW:'product_view',PRODUCT_ADD_TO_CART:'product_add_to_cart',PRODUCT_REMOVE_FROM_CART:'product_remove_from_cart',CHECKOUT_START:'checkout_start',CHECKOUT_COMPLETE:'checkout_complete',CHECKOUT_ABANDON:'checkout_abandon',PAYMENT_INITIATED:'payment_initiated',PAYMENT_SUCCESS:'payment_success',PAYMENT_FAILED:'payment_failed',ADMIN_PRODUCT_UPDATE:'admin_product_update',ADMIN_INVENTORY_UPDATE:'admin_inventory_update',ADMIN_PRICE_CHANGE:'admin_price_change',CATEGORY_VIEW:'category_view',INGREDIENT_FILTER:'ingredient_filter',SEARCH_QUERY:'search_query',SQUARE_ORDER_CREATED:'square_order_created',SQUARE_PAYMENT_COMPLETE:'square_payment_complete',SQUARE_INVENTORY_UPDATE:'square_inventory_update'};

export async function trackEvent(eventType,eventData,metadata={}){
  try{
    const safeMetadata={...metadata,source:metadata.source||'frontend',userAgent:metadata.userAgent||'unknown',ip:metadata.ip||'unknown'};
    await getTursoConnection().run('INSERT INTO analytics_events(id,event_type,event_data_json,metadata_json,occurred_at) VALUES(?,?,?,?,?)',randomUUID(),String(eventType),JSON.stringify(eventData??{}),JSON.stringify(safeMetadata),new Date().toISOString());
    return true;
  }catch(error){logger.error('Analytics','Track event failed',error);return false;}
}

export function trackSquareEvent(webhookType,eventData){const mapping={'order.created':EVENT_TYPES.SQUARE_ORDER_CREATED,'payment.updated':EVENT_TYPES.SQUARE_PAYMENT_COMPLETE,'inventory.count.updated':EVENT_TYPES.SQUARE_INVENTORY_UPDATE};return trackEvent(mapping[webhookType]||'square_webhook',eventData,{source:'square_webhook'});}

// Schema and indexes are source-controlled; runtime initialization is a no-op.
export async function initializeAnalytics(){return true;}
