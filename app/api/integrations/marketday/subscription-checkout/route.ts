import { NextRequest, NextResponse } from "next/server";
import { createHash, createPublicKey, verify } from "node:crypto";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Marketday subscription checkout through the existing Taste of Gratitude
 * Square merchant. Never exports or copies the merchant credential.
 *
 * Different brand, product, order references and entitlement system.
 * Deployment remains disabled until signed Marketday accounts, webhook
 * settlement, monthly plan and commercial approval are independently proven.
 */
const path = "/api/integrations/marketday/subscription-checkout";
const headers = { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" };
const MAX_LENGTH = 2500;
const PRICE_CENTS = 1900;
const SQ_VERSION = "2026-09-16";

const inputSchema = z.object({
  version: z.literal(1),
  purchaseId: z.string().uuid(),
  memberId: z.string().uuid(),
  product: z.literal("MARKETDAY_AI_MONTHLY"),
  amountCents: z.literal(PRICE_CENTS),
  currency: z.literal("USD"),
}).strict();

function signed(request: NextRequest, body: string) {
  const keyB64 = process.env.MARKETDAY_PAYMENT_PUBLIC_KEY;
  if (!keyB64) return false;
  const timestamp = request.headers.get("x-marketday-timestamp") || "";
  const signature = request.headers.get("x-marketday-signature") || "";
  if (!/^\d{10}$/.test(timestamp) ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(signature) ||
      Math.abs(Math.floor(Date.now()/1000) - Number(timestamp)) > 300) return false;
  try {
    const key = createPublicKey({
      key: Buffer.from(keyB64, "base64"), format: "der", type: "spki",
    });
    if (key.asymmetricKeyType !== "ed25519") return false;
    const digest = createHash("sha256").update(body, "utf8").digest("hex");
    return verify(null, Buffer.from([timestamp, "POST", path, digest].join("\n")),
      key, Buffer.from(signature, "base64"));
  } catch { return false; }
}

const json = (data: object, status: number) =>
  NextResponse.json(data, { status, headers });

function priceVerified(obj: any, locationId: string, expectedVariationId: string): boolean {
  if (!obj || obj.type !== "SUBSCRIPTION_PLAN_VARIATION" ||
      obj.id !== expectedVariationId || obj.is_deleted === true ||
      obj.present_at_all_locations === false &&
        !(Array.isArray(obj.present_at_location_ids) && obj.present_at_location_ids.includes(locationId)))
    return false;

  const phases = obj.subscription_plan_variation_data?.phases;
  return Array.isArray(phases) && phases.length === 1 &&
    phases[0]?.cadence === "MONTHLY" &&
    phases[0]?.pricing?.type === "STATIC" &&
    phases[0]?.pricing?.price?.amount === PRICE_CENTS &&
    phases[0]?.pricing?.price?.currency === "USD";
}

export async function POST(request: NextRequest) {
  if (Number(request.headers.get("content-length") || 0) > MAX_LENGTH)
    return json({ error: "request_too_large" }, 413);
  const raw = await request.text();
  if (raw.length > MAX_LENGTH) return json({ error: "request_too_large" }, 413);
  if (!signed(request, raw)) return json({ error: "unauthorized" }, 401);

  let parsed: z.infer<typeof inputSchema>;
  try {
    const result = inputSchema.safeParse(JSON.parse(raw));
    if (!result.success) return json({ error: "invalid_purchase" }, 400);
    parsed = result.data;
  } catch { return json({ error: "invalid_json" }, 400); }

  // All commercial gates must pass *before* any external Square mutation.
  if (process.env.MARKETDAY_SQUARE_BRIDGE_ENABLED !== "1" ||
      process.env.MARKETDAY_COMMERCIAL_APPROVED !== "1" ||
      process.env.MARKETDAY_ENTITLEMENT_VERIFIER_ENABLED !== "1")
    return json({ error: "awaiting_marketday_subscription_certification" }, 503);

  const token = process.env.SQUARE_ACCESS_TOKEN;
  const location = process.env.SQUARE_LOCATION_ID;
  const variation = process.env.MARKETDAY_SQUARE_PLAN_VARIATION_ID;
  if (process.env.SQUARE_ENVIRONMENT?.toLowerCase() !== "production" ||
      !token || token.length < 20 ||
      !location || !/^L[A-Z0-9]{10,25}$/.test(location) ||
      !variation || !/^[A-Z0-9]{16,80}$/.test(variation))
    return json({ error: "merchant_configuration_unavailable" }, 503);

  const base = "https://connect.squareup.com";
  const squareHeaders = {
    Authorization: "Bearer " + token,
    "Square-Version": SQ_VERSION,
    "Content-Type": "application/json",
  };
  try {
    // Read-only catalog verification prevents accidental $19 overrides of an
    // unrelated Taste of Gratitude plan or catalog item.
    const verifyResponse = await fetch(
      base + "/v2/catalog/object/" + encodeURIComponent(variation), {
        headers: squareHeaders, cache: "no-store",
        signal: AbortSignal.timeout(7500),
      });
    if (!verifyResponse.ok)
      return json({ error: "subscription_plan_unavailable" }, 503);
    const plan = await verifyResponse.json();
    if (!priceVerified(plan.object, location, variation))
      return json({ error: "unapproved_subscription_plan" }, 422);

    const payload = {
      idempotency_key: "marketday-monthly-" + parsed.purchaseId,
      description: "Cod3Black Marketday AI — $19 per month, billed by Square",
      payment_note: "COD3BLACK_MARKETDAY_AI_MONTHLY | " + parsed.purchaseId,
      quick_pay: {
        location_id: location,
        name: "Cod3Black Marketday AI — Monthly Subscription",
        price_money: { amount: PRICE_CENTS, currency: "USD" },
      },
      checkout_options: {
        subscription_plan_id: variation,
        allow_tipping: false,
        redirect_url: "https://marketday-vendor-pilot.vercel.app/billing/return",
      },
    };
    const response = await fetch(base + "/v2/online-checkout/payment-links", {
      method: "POST", headers: squareHeaders, body: JSON.stringify(payload),
      cache: "no-store", signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return json({ error: "square_subscription_checkout_failed" }, 502);
    const result = await response.json();
    const link = result?.payment_link;
    if (typeof link?.id !== "string" || typeof link?.url !== "string" ||
       !/^https:\/\/(square\.link|checkout\.square\.site)\//.test(link.url))
      return json({ error: "invalid_square_checkout_response" }, 502);
    return json({
      ok: true,
      provider: "square",
      product: "MARKETDAY_AI_MONTHLY",
      sellerDisclosure: "Processed by Taste of Gratitude for Cod3Black Marketday",
      purchaseId: parsed.purchaseId,
      checkoutUrl: link.url,
      paymentLinkId: link.id,
      // Not a paid entitlement. Access activates only through independent
      // settled-subscription verification and durable membership mapping.
      membershipStatus: "pending_square_verification",
    }, 200);
  } catch {
    return json({ error: "square_temporarily_unavailable" }, 503);
  }
}
