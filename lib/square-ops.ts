// Critical Square operations via REST
import { sqFetch } from "./square-rest";

const env = (process.env.SQUARE_ENVIRONMENT?.toLowerCase() === "production"
  ? "production" : "sandbox") as "production" | "sandbox";
const token = process.env.SQUARE_ACCESS_TOKEN!;

export async function listLocations() {
  return sqFetch<{ locations: any[] }>(env, "/v2/locations", token);
}

export async function createPayment(input: {
  sourceId: string;
  amount: number; // minor units
  currency: "USD";
  locationId: string;
  idempotencyKey: string;
  note?: string;
}) {
  return sqFetch<any>(env, "/v2/payments", token, {
    method: "POST",
    body: JSON.stringify({
      source_id: input.sourceId,
      idempotency_key: input.idempotencyKey,
      amount_money: { amount: input.amount, currency: input.currency },
      location_id: input.locationId,
      note: input.note,
    }),
  });
}

export async function createOrder(locationId: string, body: any) {
  return sqFetch<any>(env, "/v2/orders", token, {
    method: "POST",
    body: JSON.stringify({ order: { location_id: locationId, ...body } }),
  });
}

export async function listCatalog(types?: string) {
  const qs = types ? `?types=${encodeURIComponent(types)}` : "";
  return sqFetch<any>(env, `/v2/catalog/list${qs}`, token);
}

export async function createPaymentLink(input: {
  orderId?: string;
  locationId?: string;
  lineItems?: any[];
  idempotencyKey: string;
  checkoutOptions?: {
    redirectUrl?: string;
    askForShippingAddress?: boolean;
  };
}) {
  const body: any = {
    idempotency_key: input.idempotencyKey,
    checkout_options: input.checkoutOptions,
  };
  
  // Square API: Either reference existing order OR create new order with line items
  if (input.orderId && !input.lineItems) {
    // Reference existing order - ONLY pass id and location_id
    body.order = {
      id: input.orderId,
      location_id: input.locationId
    };
  } else if (input.lineItems && input.lineItems.length > 0) {
    // Create new order with line items - do NOT include order.id
    body.order = {
      location_id: input.locationId,
      line_items: input.lineItems
    };
  }
  
  return sqFetch<any>(env, "/v2/online-checkout/payment-links", token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function retrieveOrder(orderId: string) {
  return sqFetch<any>(env, `/v2/orders/${orderId}`, token);
}

export async function listPayments(params?: {
  beginTime?: string;
  endTime?: string;
  locationId?: string;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.beginTime) searchParams.set("begin_time", params.beginTime);
  if (params?.endTime) searchParams.set("end_time", params.endTime);
  if (params?.locationId) searchParams.set("location_id", params.locationId);
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  
  const qs = searchParams.toString();
  return sqFetch<any>(env, `/v2/payments${qs ? `?${qs}` : ""}`, token);
}
