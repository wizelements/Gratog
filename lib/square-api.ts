/**
 * Square REST API Client - Direct API calls for full control
 * Handles: Payments, Orders, Customers, Catalog
 */

import { randomUUID } from 'crypto';

// ISS-029 FIX: Standardized Square API version across all modules
const SQUARE_VERSION = '2025-10-16';

type SquareEnv = 'sandbox' | 'production';

function getBaseUrl(): string {
  const env = (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase() as SquareEnv;
  return env === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

function getHeaders(): HeadersInit {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) throw new Error('SQUARE_ACCESS_TOKEN not configured');
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Square-Version': SQUARE_VERSION
  };
}

function getLocationId(): string {
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) throw new Error('SQUARE_LOCATION_ID not configured');
  return locationId;
}

/**
 * Sanitize metadata for Square API - removes empty/null/undefined values
 * Square rejects metadata with empty string values
 */
export function sanitizeMetadata(metadata?: Record<string, string | undefined | null>): Record<string, string> | undefined {
  if (!metadata) return undefined;
  const cleaned: Record<string, string> = {};
  const entries = Object.entries(metadata);
  for (const [key, value] of entries) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key.slice(0, 40)] = String(value).slice(0, 500);
    }
    if (Object.keys(cleaned).length >= 10) break;
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export interface SquareError {
  category: string;
  code: string;
  detail: string;
  field?: string;
}

export interface SquareResponse<T> {
  success: boolean;
  data?: T;
  errors?: SquareError[];
  /** Non-2xx is an observed result. Unknown means the network/response
   * outcome may have been committed by Square, even without a response. */
  httpStatus?: number;
  outcomeUnknown?: boolean;
}

/** Only an explicit issuer/payment-method decline permits a fresh charge
 * attempt. Timeouts, 429, 5xx and unparseable success responses NEVER do. */
const FINAL_DECLINES = new Set([
  'CARD_DECLINED', 'GENERIC_DECLINE', 'CVV_FAILURE',
  'ADDRESS_VERIFICATION_FAILURE', 'EXPIRATION_FAILURE',
  'CARD_EXPIRED', 'INSUFFICIENT_FUNDS', 'PAN_FAILURE',
  'CARD_NOT_SUPPORTED', 'CARD_TOKEN_EXPIRED', 'INVALID_CARD',
  'INVALID_ACCOUNT', 'VERIFY_CVV_FAILURE', 'VERIFY_AVS_FAILURE',
  'CARD_DECLINED_CALL_ISSUER', 'CARD_DECLINED_VERIFICATION_REQUIRED',
]);
export function isDefinitiveSquarePaymentDecline(
  result: SquareResponse<unknown>
): boolean {
  return result.success === false && !result.outcomeUnknown &&
    [400, 402].includes(result.httpStatus ?? 0) &&
    Boolean(result.errors?.some(error =>
      error.category === 'PAYMENT_METHOD_ERROR' && FINAL_DECLINES.has(error.code)));
}

/** An explicit malformed/unauthorized link request is not a payable link.
 * All ambiguous transport, server and throttle failures retain their holds. */
export function isDefinitiveSquareLinkFailure(
  result: SquareResponse<unknown>
): boolean {
  return result.success === false && !result.outcomeUnknown &&
    [400, 401, 403, 404, 422].includes(result.httpStatus ?? 0) &&
    Boolean(result.errors?.some(error =>
      ['INVALID_REQUEST_ERROR', 'AUTHENTICATION_ERROR'].includes(error.category)));
}


async function squareRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, unknown>
): Promise<SquareResponse<T>> {
  const url = `${getBaseUrl()}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method,
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });

    // A successful HTTP response with an unreadable body is ambiguous:
    // Square may have committed the operation already.
    const data = await response.json().catch(() => null);
    if (data === null) {
      return { success: false, outcomeUnknown: true, httpStatus: response.status,
        errors: [{ category: 'NETWORK_ERROR', code: 'UNREADABLE_SQUARE_RESPONSE',
          detail: 'Square outcome unknown; reconcile before retry' }] };
    }

    if (!response.ok) {
      return {
        success: false,
        httpStatus: response.status,
        outcomeUnknown: response.status === 429 || response.status >= 500,
        errors: data.errors || [{ category: 'API_ERROR', code: 'UNKNOWN', detail: 'Request failed' }]
      };
    }

    return { success: true, data, httpStatus: response.status };
  } catch (error) {
    return {
      success: false,
      outcomeUnknown: true,
      errors: [{
        category: 'NETWORK_ERROR',
        code: 'FETCH_FAILED',
        detail: error instanceof Error ? error.message : 'Network request failed'
      }]
    };
  }
}

// ============================================================================
// RESPONSE NORMALIZATION (Square REST returns snake_case)
// ============================================================================

function normalizeCardDetails(raw: any): PaymentResult['cardDetails'] | undefined {
  const cd = raw?.cardDetails ?? raw?.card_details;
  if (!cd) return undefined;
  const card = cd.card;
  return {
    card: {
      cardBrand: card?.cardBrand ?? card?.card_brand,
      last4: card?.last4 ?? card?.last_4,
      expMonth: card?.expMonth ?? card?.exp_month,
      expYear: card?.expYear ?? card?.exp_year,
    },
    status: cd.status,
  };
}

function normalizePayment(raw: any): PaymentResult {
  return {
    id: raw.id,
    status: raw.status,
    amountMoney: raw.amountMoney ?? raw.amount_money,
    totalMoney: raw.totalMoney ?? raw.total_money,
    receiptUrl: raw.receiptUrl ?? raw.receipt_url,
    receiptNumber: raw.receiptNumber ?? raw.receipt_number,
    orderId: raw.orderId ?? raw.order_id,
    customerId: raw.customerId ?? raw.customer_id,
    cardDetails: normalizeCardDetails(raw),
    createdAt: raw.createdAt ?? raw.created_at,
  };
}

// ============================================================================
// PAYMENTS API
// ============================================================================

export interface CreatePaymentRequest {
  sourceId: string;
  amountCents: number;
  currency?: string;
  orderId?: string;
  customerId?: string;
  note?: string;
  referenceId?: string;
  buyerEmailAddress?: string;
  idempotencyKey?: string;
}

export interface PaymentResult {
  id: string;
  status: string;
  amountMoney: { amount: number; currency: string };
  totalMoney: { amount: number; currency: string };
  receiptUrl?: string;
  receiptNumber?: string;
  orderId?: string;
  customerId?: string;
  cardDetails?: {
    card: {
      cardBrand: string;
      last4: string;
      expMonth: number;
      expYear: number;
    };
    status: string;
  };
  createdAt: string;
}

export async function createPayment(req: CreatePaymentRequest): Promise<SquareResponse<{ payment: PaymentResult }>> {
  const idempotencyKey = req.idempotencyKey || randomUUID();
  const locationId = getLocationId();
  
  const result = await squareRequest<{ payment: any }>('/v2/payments', 'POST', {
    source_id: req.sourceId,
    idempotency_key: idempotencyKey,
    amount_money: {
      amount: req.amountCents,
      currency: req.currency || 'USD'
    },
    location_id: locationId,
    order_id: req.orderId,
    customer_id: req.customerId,
    note: req.note?.substring(0, 500),
    reference_id: req.referenceId,
    buyer_email_address: req.buyerEmailAddress,
    autocomplete: true
  });

  if (result.success && result.data?.payment) {
    return { success: true, data: { payment: normalizePayment(result.data.payment) } };
  }
  return result as SquareResponse<{ payment: PaymentResult }>;
}

export async function getPayment(paymentId: string): Promise<SquareResponse<{ payment: PaymentResult }>> {
  const result = await squareRequest<{ payment: any }>(`/v2/payments/${paymentId}`);
  if (result.success && result.data?.payment) {
    return { success: true, data: { payment: normalizePayment(result.data.payment) } };
  }
  return result as SquareResponse<{ payment: PaymentResult }>;
}

// ============================================================================
// ORDERS API
// ============================================================================

export interface OrderLineItem {
  catalogObjectId?: string;
  name: string;
  quantity: string;
  basePriceMoney?: { amount: number; currency: string };
  note?: string;
}

export interface OrderFulfillment {
  type: 'PICKUP' | 'SHIPMENT' | 'DELIVERY';
  state: 'PROPOSED' | 'RESERVED' | 'PREPARED' | 'COMPLETED' | 'CANCELED';
  pickupDetails?: {
    recipient: { displayName: string; phoneNumber?: string };
    scheduleType?: 'SCHEDULED' | 'ASAP';
    pickupAt?: string;
    note?: string;
  };
  shipmentDetails?: {
    recipient: {
      displayName: string;
      phoneNumber?: string;
      address?: {
        addressLine1: string;
        locality: string;
        administrativeDistrictLevel1: string;
        postalCode: string;
        country?: string;
      };
    };
    shippingNote?: string;
    expectedShippedAt?: string;
  };
}

export interface CreateOrderRequest {
  referenceId?: string;
  lineItems: OrderLineItem[];
  customerId?: string;
  fulfillments?: OrderFulfillment[];
  metadata?: Record<string, string>;
  idempotencyKey?: string;
}

export interface OrderResult {
  id: string;
  referenceId?: string;
  state: string;
  lineItems: Array<{
    uid: string;
    name: string;
    quantity: string;
    catalogObjectId?: string;
    basePriceMoney?: { amount: number; currency: string };
    totalMoney?: { amount: number; currency: string };
  }>;
  totalMoney?: { amount: number; currency: string };
  totalTaxMoney?: { amount: number; currency: string };
  netAmounts?: {
    totalMoney: { amount: number; currency: string };
    taxMoney: { amount: number; currency: string };
  };
  fulfillments?: OrderFulfillment[];
  createdAt: string;
  updatedAt: string;
}

export async function createOrder(req: CreateOrderRequest): Promise<SquareResponse<{ order: OrderResult }>> {
  const locationId = getLocationId();
  const idempotencyKey = req.idempotencyKey || randomUUID();

  const lineItems = req.lineItems.map(item => {
    const lineItem: Record<string, unknown> = {
      name: item.name,
      quantity: item.quantity,
    };
    
    // Only include catalog_object_id if it's a valid-looking Square ID
    // Square catalog IDs are typically 20+ char alphanumeric strings
    if (item.catalogObjectId && item.catalogObjectId.length > 20 && /^[A-Z0-9]+$/i.test(item.catalogObjectId)) {
      lineItem.catalog_object_id = item.catalogObjectId;
    }
    
    // Always include base_price_money for ad-hoc items or as fallback
    if (item.basePriceMoney) {
      lineItem.base_price_money = {
        amount: item.basePriceMoney.amount,
        currency: item.basePriceMoney.currency
      };
    }
    
    if (item.note) {
      lineItem.note = item.note;
    }
    
    return lineItem;
  });

  const fulfillments = req.fulfillments?.map(f => ({
    type: f.type,
    state: f.state,
    pickup_details: f.pickupDetails ? {
      recipient: {
        display_name: f.pickupDetails.recipient.displayName,
        phone_number: f.pickupDetails.recipient.phoneNumber
      },
      schedule_type: f.pickupDetails.scheduleType,
      pickup_at: f.pickupDetails.pickupAt,
      note: f.pickupDetails.note
    } : undefined,
    shipment_details: f.shipmentDetails ? {
      recipient: {
        display_name: f.shipmentDetails.recipient.displayName,
        phone_number: f.shipmentDetails.recipient.phoneNumber,
        address: f.shipmentDetails.recipient.address ? {
          address_line_1: f.shipmentDetails.recipient.address.addressLine1,
          locality: f.shipmentDetails.recipient.address.locality,
          administrative_district_level_1: f.shipmentDetails.recipient.address.administrativeDistrictLevel1,
          postal_code: f.shipmentDetails.recipient.address.postalCode,
          country: f.shipmentDetails.recipient.address.country || 'US'
        } : undefined
      },
      shipping_note: f.shipmentDetails.shippingNote,
      expected_shipped_at: f.shipmentDetails.expectedShippedAt
    } : undefined
  }));

  return squareRequest('/v2/orders', 'POST', {
    idempotency_key: idempotencyKey,
    order: {
      location_id: locationId,
      reference_id: req.referenceId,
      customer_id: req.customerId,
      line_items: lineItems,
      fulfillments,
      metadata: sanitizeMetadata(req.metadata)
    }
  });
}

export async function getOrder(orderId: string): Promise<SquareResponse<{ order: OrderResult }>> {
  return squareRequest(`/v2/orders/${orderId}`);
}

/**
 * Square's hosted checkout expects an E.164 buyer phone number.
 * The UI accepts local US numbers; malformed optional prefills are omitted
 * so a contact-format issue cannot block an otherwise valid payment.
 */
export function normalizeBuyerPhoneForSquare(value?: string): string | undefined {
  if (typeof value !== 'string') return undefined;
  const digits = value.replace(/\D/g, '');
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (!/^\d{10}$/.test(national) || national[0] === '0' || national[0] === '1' ||
      national[3] === '0' || national[3] === '1') return undefined;
  return '+1' + national;
}

export interface CreatePaymentLinkRequest extends CreateOrderRequest {
  description?: string;
  redirectUrl?: string;
  buyerEmail?: string;
  buyerPhone?: string;
}

export interface PaymentLinkResult {
  id: string;
  version?: number;
  orderId?: string;
  url: string;
  createdAt?: string;
}

export async function createPaymentLink(
  req: CreatePaymentLinkRequest
): Promise<SquareResponse<{ paymentLink: PaymentLinkResult }>> {
  const locationId = getLocationId();
  const idempotencyKey = req.idempotencyKey || randomUUID();

  const lineItems = req.lineItems.map(item => {
    const lineItem: Record<string, unknown> = {
      name: item.name,
      quantity: item.quantity,
    };

    if (item.catalogObjectId && item.catalogObjectId.length > 20 && /^[A-Z0-9]+$/i.test(item.catalogObjectId)) {
      lineItem.catalog_object_id = item.catalogObjectId;
    }

    if (item.basePriceMoney) {
      lineItem.base_price_money = {
        amount: item.basePriceMoney.amount,
        currency: item.basePriceMoney.currency
      };
    }

    if (item.note) {
      lineItem.note = item.note;
    }

    return lineItem;
  });

  const fulfillments = req.fulfillments?.map(f => ({
    type: f.type,
    state: f.state,
    pickup_details: f.pickupDetails ? {
      recipient: {
        display_name: f.pickupDetails.recipient.displayName,
        phone_number: f.pickupDetails.recipient.phoneNumber
      },
      schedule_type: f.pickupDetails.scheduleType,
      pickup_at: f.pickupDetails.pickupAt,
      note: f.pickupDetails.note
    } : undefined,
    shipment_details: f.shipmentDetails ? {
      recipient: {
        display_name: f.shipmentDetails.recipient.displayName,
        phone_number: f.shipmentDetails.recipient.phoneNumber,
        address: f.shipmentDetails.recipient.address ? {
          address_line_1: f.shipmentDetails.recipient.address.addressLine1,
          locality: f.shipmentDetails.recipient.address.locality,
          administrative_district_level_1: f.shipmentDetails.recipient.address.administrativeDistrictLevel1,
          postal_code: f.shipmentDetails.recipient.address.postalCode,
          country: f.shipmentDetails.recipient.address.country || 'US'
        } : undefined
      },
      shipping_note: f.shipmentDetails.shippingNote,
      expected_shipped_at: f.shipmentDetails.expectedShippedAt
    } : undefined
  }));

  const result = await squareRequest<{ payment_link: any }>('/v2/online-checkout/payment-links', 'POST', {
    idempotency_key: idempotencyKey,
    description: req.description,
    order: {
      location_id: locationId,
      reference_id: req.referenceId,
      customer_id: req.customerId,
      line_items: lineItems,
      fulfillments,
      metadata: sanitizeMetadata(req.metadata)
    },
    checkout_options: req.redirectUrl ? {
      redirect_url: req.redirectUrl,
      ask_for_shipping_address: false,
    } : undefined,
    pre_populated_data: (req.buyerEmail?.trim() || normalizeBuyerPhoneForSquare(req.buyerPhone)) ? {
      ...(req.buyerEmail?.trim() ? { buyer_email: req.buyerEmail.trim() } : {}),
      ...(normalizeBuyerPhoneForSquare(req.buyerPhone)
        ? { buyer_phone_number: normalizeBuyerPhoneForSquare(req.buyerPhone) }
        : {}),
    } : undefined,
  });

  if (result.success && result.data?.payment_link) {
    const raw = result.data.payment_link;
    return {
      success: true,
      data: {
        paymentLink: {
          id: raw.id,
          version: raw.version,
          orderId: raw.order_id,
          url: raw.url,
          createdAt: raw.created_at,
        }
      }
    };
  }

  return { success: false, errors: result.errors,
    httpStatus: result.httpStatus, outcomeUnknown: result.outcomeUnknown };
}

export async function updateOrderState(
  orderId: string,
  state: 'COMPLETED' | 'CANCELED',
  idempotencyKey?: string
): Promise<SquareResponse<{ order: OrderResult }>> {
  return squareRequest(`/v2/orders/${orderId}`, 'PUT', {
    idempotency_key: idempotencyKey || randomUUID(),
    order: {
      location_id: getLocationId(),
      state,
      version: 1
    }
  });
}

// ============================================================================
// CUSTOMERS API
// ============================================================================

export interface CreateCustomerRequest {
  email: string;
  givenName?: string;
  familyName?: string;
  phoneNumber?: string;
  referenceId?: string;
  note?: string;
  address?: {
    addressLine1: string;
    locality: string;
    administrativeDistrictLevel1: string;
    postalCode: string;
    country?: string;
  };
  idempotencyKey?: string;
}

export interface CustomerResult {
  id: string;
  givenName?: string;
  familyName?: string;
  emailAddress?: string;
  phoneNumber?: string;
  referenceId?: string;
  createdAt: string;
  updatedAt: string;
}

export async function createCustomer(req: CreateCustomerRequest): Promise<SquareResponse<{ customer: CustomerResult }>> {
  return squareRequest('/v2/customers', 'POST', {
    idempotency_key: req.idempotencyKey || randomUUID(),
    email_address: req.email,
    given_name: req.givenName,
    family_name: req.familyName,
    phone_number: req.phoneNumber,
    reference_id: req.referenceId,
    note: req.note,
    address: req.address ? {
      address_line_1: req.address.addressLine1,
      locality: req.address.locality,
      administrative_district_level_1: req.address.administrativeDistrictLevel1,
      postal_code: req.address.postalCode,
      country: req.address.country || 'US'
    } : undefined
  });
}

export async function searchCustomers(email: string): Promise<SquareResponse<{ customers: CustomerResult[] }>> {
  return squareRequest('/v2/customers/search', 'POST', {
    query: {
      filter: {
        email_address: { exact: email }
      }
    }
  });
}

export async function findOrCreateCustomer(req: CreateCustomerRequest): Promise<SquareResponse<{ customer: CustomerResult; created: boolean }>> {
  // Search first
  const searchResult = await searchCustomers(req.email);
  
  if (searchResult.success && searchResult.data?.customers?.length) {
    return {
      success: true,
      data: { customer: searchResult.data.customers[0], created: false }
    };
  }

  // Create new
  const createResult = await createCustomer(req);
  
  if (createResult.success && createResult.data?.customer) {
    return {
      success: true,
      data: { customer: createResult.data.customer, created: true }
    };
  }

  return {
    success: false,
    errors: createResult.errors
  };
}

// ============================================================================
// CATALOG API
// ============================================================================

export interface CatalogItem {
  id: string;
  type: string;
  itemData?: {
    name: string;
    description?: string;
    categoryId?: string;
    variations?: Array<{
      id: string;
      itemVariationData: {
        name: string;
        priceMoney?: { amount: number; currency: string };
        sku?: string;
      };
    }>;
    imageIds?: string[];
  };
}

export async function listCatalogItems(): Promise<SquareResponse<{ objects: CatalogItem[] }>> {
  return squareRequest('/v2/catalog/list?types=ITEM');
}

export async function getCatalogItem(objectId: string): Promise<SquareResponse<{ object: CatalogItem }>> {
  return squareRequest(`/v2/catalog/object/${objectId}`);
}

// ============================================================================
// REFUNDS API
// ============================================================================

export interface CreateRefundRequest {
  paymentId: string;
  amountCents: number;
  currency?: string;
  reason?: string;
  idempotencyKey?: string;
}

export interface RefundResult {
  id: string;
  status: string;
  amountMoney: { amount: number; currency: string };
  paymentId: string;
  reason?: string;
  createdAt: string;
}

export async function createRefund(req: CreateRefundRequest): Promise<SquareResponse<{ refund: RefundResult }>> {
  return squareRequest('/v2/refunds', 'POST', {
    idempotency_key: req.idempotencyKey || randomUUID(),
    payment_id: req.paymentId,
    amount_money: {
      amount: req.amountCents,
      currency: req.currency || 'USD'
    },
    reason: req.reason
  });
}

// ============================================================================
// CONFIG / HEALTH
// ============================================================================

export function getSquareConfig() {
  const env = (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase() as SquareEnv;
  const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
  const locationId = process.env.SQUARE_LOCATION_ID;

  if (!appId || !locationId) {
    throw new Error('Square configuration incomplete');
  }

  return {
    applicationId: appId,
    locationId,
    environment: env,
    sdkUrl: env === 'production'
      ? 'https://web.squarecdn.com/v1/square.js'
      : 'https://sandbox.web.squarecdn.com/v1/square.js'
  };
}

export async function healthCheck(): Promise<{ healthy: boolean; location?: string; error?: string }> {
  try {
    const result = await squareRequest<{ location: { id: string; name: string } }>(
      `/v2/locations/${getLocationId()}`
    );
    
    if (result.success && result.data?.location) {
      return { healthy: true, location: result.data.location.name };
    }
    
    return { healthy: false, error: result.errors?.[0]?.detail || 'Unknown error' };
  } catch (error) {
    return { healthy: false, error: error instanceof Error ? error.message : 'Health check failed' };
  }
}
