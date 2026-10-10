import { NextRequest, NextResponse } from "next/server";
import { createHash, createPublicKey, verify } from "node:crypto";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Temporary merchant processor for approved Cod3Black Studio purchases.
 *
 * This route uses the existing Taste of Gratitude Square credential ONLY
 * inside the Taste of Gratitude deployment. It never exposes, replicates,
 * or exports the merchant token to Signal, Studio, or OPEE.
 *
 * Until commercial approval and a reconciled Studio purchase have passed
 * independent release gates, this endpoint fails closed.
 */
const path = "/api/integrations/opee/studio-checkout";
const squareApi = "https://connect.squareup.com";
const configHeaders = { "Cache-Control": "no-store, private" };

const inputSchema = z.object({
  version: z.literal(1),
  purchaseId: z.string().uuid(),
  credits: z.number().int().min(1).max(1000),
  amountCents: z.number().int().min(100).max(1000000),
  currency: z.literal("USD"),
}).strict();

function authorized(request: NextRequest, raw: string): boolean {
  // This is a PUBLIC verification key, not a merchant or OPEE secret.
  // Deployment settings can rotate it; the known OPEE ingress public key is
  // pinned until commercial rollout provisions a managed trust registry.
  const keyDerB64 = process.env.COD3BLACK_OPEE_PAYMENT_PUBLIC_KEY ||
    "MCowBQYDK2VwAyEA7zDVGlmlKLnOLBEfAqBEPxwZp3m4YJ/NcdPCZEiQrMg=";
  if (!keyDerB64) return false;

  const ts = request.headers.get("x-opee-timestamp") || "";
  const signature = request.headers.get("x-opee-signature") || "";
  if (!/^\d{10}$/.test(ts) || !/^[A-Za-z0-9+/]+={0,2}$/.test(signature)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(ts)) > 300) return false;
  try {
    const publicKey = createPublicKey({
      key: Buffer.from(keyDerB64, "base64"), format: "der", type: "spki",
    });
    if (publicKey.asymmetricKeyType !== "ed25519") return false;
    const digest = createHash("sha256").update(raw, "utf8").digest("hex");
    const payload = Buffer.from([ts, "POST", path, digest].join("\n"));
    return verify(null, payload, publicKey, Buffer.from(signature, "base64"));
  } catch { return false; }
}

function allowedPrice(credits: number): number | null {
  try {
    const pack = JSON.parse(process.env.COD3BLACK_STUDIO_PACKS_JSON || "{}") as Record<string, unknown>;
    const n = pack[String(credits)];
    return Number.isSafeInteger(n) && typeof n === "number" && n >= 100 ? n : null;
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  const length = Number(request.headers.get("content-length") || "0");
  if (length > 4096) return NextResponse.json({ error: "request_too_large" }, { status: 413, headers: configHeaders });
  const raw = await request.text();
  if (raw.length > 4096) return NextResponse.json({ error: "request_too_large" }, { status: 413, headers: configHeaders });
  if (!authorized(request, raw)) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: configHeaders });

  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: configHeaders }); }
  const parsed = inputSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "invalid_purchase" }, { status: 400, headers: configHeaders });

  const { purchaseId, credits, amountCents } = parsed.data;
  const allowed = allowedPrice(credits);
  if (allowed === null || amountCents !== allowed)
    return NextResponse.json({ error: "pricing_not_approved" }, { status: 422, headers: configHeaders });

  const enabled =
    process.env.COD3BLACK_SQUARE_BRIDGE_ENABLED === "1" &&
    process.env.COD3BLACK_STUDIO_COMMERCE_APPROVED === "1";

  if (!enabled) return NextResponse.json({
    error: "awaiting_commercial_activation",
    message: "Cod3Black checkout is not available yet.",
  }, { status: 503, headers: configHeaders });

  const token = process.env.SQUARE_ACCESS_TOKEN;
  const location = process.env.COD3BLACK_SQUARE_LOCATION_ID;
  const redirect = process.env.COD3BLACK_STUDIO_REDIRECT_URL;
  if (
    (process.env.SQUARE_ENVIRONMENT || "production").toLowerCase() !== "production" ||
    !token || token.length < 20 ||
    !location || !/^L[A-Z0-9]{10,25}$/.test(location) ||
    !redirect || !redirect.startsWith("https://opee-proofline.vercel.app/")
  ) return NextResponse.json({ error: "merchant_configuration_unavailable" }, { status: 503, headers: configHeaders });

  const squareOrder = {
    idempotency_key: "cod3black-studio-" + purchaseId,
    description: "Cod3Black Agency — OPEE Studio digital credits",
    payment_note: "COD3BLACK_OPEE_STUDIO_CREDITS | " + credits + " credits | " + purchaseId,
    order: {
      location_id: location,
      reference_id: purchaseId,
      metadata: {
        brand: "COD3BLACK_AGENCY",
        processor: "TASTE_OF_GRATITUDE",
        studio_product: "OPEE_STUDIO_CREDITS",
        studio_purchase_id: purchaseId,
      },
      line_items: [{
        name: "Cod3Black Agency — OPEE Studio Credits (" + credits + ")",
        quantity: "1",
        base_price_money: { amount: amountCents, currency: "USD" },
      }],
    },
    checkout_options: { redirect_url: redirect },
  };

  try {
    const response = await fetch(squareApi + "/v2/online-checkout/payment-links", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Square-Version": "2025-10-16",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(squareOrder),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok)
      return NextResponse.json({ error: "checkout_unavailable" }, { status: 502, headers: configHeaders });
    const result = await response.json();
    const link = result?.payment_link;
    if (
      typeof link?.id !== "string" || typeof link?.order_id !== "string" ||
      typeof link?.url !== "string" || !/^https:\/\/(square\.link|checkout\.square\.site)\//.test(link.url)
    ) return NextResponse.json({ error: "invalid_checkout_response" }, { status: 502, headers: configHeaders });
    return NextResponse.json({
      ok: true,
      provider: "square",
      sellerDisclosure: "Payment processed by Taste of Gratitude for Cod3Black Agency",
      purchaseId,
      paymentLinkId: link.id,
      providerOrderId: link.order_id,
      checkoutUrl: link.url,
    }, { headers: configHeaders });
  } catch {
    return NextResponse.json({ error: "checkout_temporarily_unavailable" }, { status: 503, headers: configHeaders });
  }
}
