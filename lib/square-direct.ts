/**
 * Direct Square SDK calls - bypass custom timeout layer
 * The Square SDK handles its own timeouts and retries more intelligently
 * This replaces square-ops and square-rest with native SDK methods
 */
import { getSquareClient, getSquareLocationId } from './square';

export async function createPaymentDirect(params: {
  sourceId: string;
  amount: number;
  currency: string;
  orderId?: string;
  customerId?: string;
  idempotencyKey: string;
  metadata?: Record<string, string>;
}) {
  const client = getSquareClient();
  const { paymentsApi } = client;

  if (!paymentsApi) {
    throw new Error('Payments API not available');
  }

  return paymentsApi.createPayment({
    sourceId: params.sourceId,
    amountMoney: {
      amount: params.amount,
      currency: params.currency,
    },
    orderId: params.orderId,
    customerId: params.customerId,
    idempotencyKey: params.idempotencyKey,
    metadata: params.metadata,
  });
}

export async function retrieveOrderDirect(orderId: string) {
  const client = getSquareClient();
  const { ordersApi } = client;

  if (!ordersApi) {
    throw new Error('Orders API not available');
  }

  return ordersApi.retrieveOrder(orderId);
}

export async function createOrderDirect(params: {
  locationId?: string;
  lineItems: Array<{
    catalogObjectId?: string;
    quantity: string;
    basePriceMoney?: {
      amount: bigint;
      currency: string;
    };
    name?: string;
  }>;
  discounts?: Array<{
    name?: string;
    type?: string;
    percentage?: string;
    amountMoney?: {
      amount: bigint;
      currency: string;
    };
  }>;
  metadata?: Record<string, string>;
}) {
  const client = getSquareClient();
  const { ordersApi } = client;

  if (!ordersApi) {
    throw new Error('Orders API not available');
  }

  return ordersApi.createOrder({
    locationId: params.locationId || getSquareLocationId(),
    lineItems: params.lineItems,
    discounts: params.discounts,
    metadata: params.metadata,
  });
}

export async function searchCustomersDirect(query?: string) {
  const client = getSquareClient();
  const { customersApi } = client;

  if (!customersApi) {
    throw new Error('Customers API not available');
  }

  if (query) {
    return customersApi.searchCustomers({
      query: {
        filter: {
          textFilter: {
            exact: query,
          },
        },
      },
    });
  }

  return customersApi.listCustomers();
}

export async function createCustomerDirect(params: {
  givenName?: string;
  familyName?: string;
  emailAddress?: string;
  phoneNumber?: string;
  referenceId?: string;
}) {
  const client = getSquareClient();
  const { customersApi } = client;

  if (!customersApi) {
    throw new Error('Customers API not available');
  }

  return customersApi.createCustomer({
    givenName: params.givenName,
    familyName: params.familyName,
    emailAddress: params.emailAddress,
    phoneNumber: params.phoneNumber,
    referenceId: params.referenceId,
  });
}

export async function listLocationsDirect() {
  const client = getSquareClient();
  const { locationsApi } = client;

  if (!locationsApi) {
    throw new Error('Locations API not available');
  }

  return locationsApi.listLocations();
}

export async function listCatalogDirect(params?: { types?: string }) {
  const client = getSquareClient();
  const { catalogApi } = client;

  if (!catalogApi) {
    throw new Error('Catalog API not available');
  }

  return catalogApi.listCatalog({
    types: params?.types,
  });
}

export async function createPaymentLinkDirect(params: {
  orderId?: string;
  locationId?: string;
  lineItems?: Array<{
    catalogObjectId?: string;
    quantity: string;
    basePriceMoney?: {
      amount: bigint;
      currency: string;
    };
    name?: string;
    variationName?: string;
    metadata?: Record<string, string>;
  }>;
  idempotencyKey: string;
  checkoutOptions?: {
    redirectUrl?: string;
    askForShippingAddress?: boolean;
  };
}) {
  const client = getSquareClient();
  const { checkoutApi } = client;

  if (!checkoutApi) {
    throw new Error('Checkout API not available');
  }

  const paymentLinkRequest: any = {
    idempotencyKey: params.idempotencyKey,
    checkoutOptions: params.checkoutOptions,
  };

  // Either reference existing order OR create new order with line items
  if (params.orderId && !params.lineItems) {
    paymentLinkRequest.order = {
      id: params.orderId,
      locationId: params.locationId,
    };
  } else if (params.lineItems && params.lineItems.length > 0) {
    paymentLinkRequest.order = {
      locationId: params.locationId || getSquareLocationId(),
      lineItems: params.lineItems,
    };
  }

  return checkoutApi.createPaymentLink(paymentLinkRequest);
}

export async function listPaymentsDirect(params?: {
  beginTime?: string;
  endTime?: string;
  locationId?: string;
  limit?: number;
}) {
  const client = getSquareClient();
  const { paymentsApi } = client;

  if (!paymentsApi) {
    throw new Error('Payments API not available');
  }

  return paymentsApi.listPayments({
    beginTime: params?.beginTime,
    endTime: params?.endTime,
    locationId: params?.locationId,
    limit: params?.limit,
  });
}
