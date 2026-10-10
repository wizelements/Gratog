import { NextRequest, NextResponse } from "next/server";
import { createHash, createPublicKey, verify } from "node:crypto";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pathname = "/api/integrations/opee/studio-receipt";
const headers = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" };
const schema = z.object({
  version: z.literal(1),
  purchaseId: z.string().uuid(),
  providerOrderId: z.string().min(8).max(192).regex(/^[A-Za-z0-9_-]+$/),
  expectedAmountCents: z.number().int().min(100).max(1000000),
}).strict();

function signedByOpee(request: NextRequest, raw: string) {
  const publicDER = process.env.COD3BLACK_OPEE_PAYMENT_PUBLIC_KEY ||
    "MCowBQYDK2VwAyEA7zDVGlmlKLnOLBEfAqBEPxwZp3m4YJ/NcdPCZEiQrMg=";
  const ts = request.headers.get("x-opee-timestamp") || "";
  const signature = request.headers.get("x-opee-signature") || "";
  if (!/^\d{10}$/.test(ts) || Math.abs(Math.floor(Date.now() / 1000) - Number(ts)) > 300 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(signature)) return false;
  try {
    const key = createPublicKey({ key: Buffer.from(publicDER, "base64"), format: "der", type: "spki" });
    const digest = createHash("sha256").update(raw, "utf8").digest("hex");
    return key.asymmetricKeyType === "ed25519" &&
      verify(null, Buffer.from([ts, "POST", pathname, digest].join("\n")), key, Buffer.from(signature, "base64"));
  } catch { return false; }
}

async function square(path: string, token: string): Promise<unknown> {
  const response = await fetch("https://connect.squareup.com" + path, {
    headers: { Authorization: "Bearer " + token, "Square-Version": "2025-10-16", Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Square receipt lookup failed");
  return response.json();
}

type SquareMoney = { amount?: number; currency?: string };
type SquareOrder = {
  id?: string; reference_id?: string; location_id?: string; state?: string;
  metadata?: Record<string, string>; total_money?: SquareMoney;
  line_items?: Array<{ name?: string; quantity?: string; base_price_money?: SquareMoney }>;
  tenders?: Array<{ id?: string; payment_id?: string }>;
};
type SquarePayment = {
  id?: string; order_id?: string; location_id?: string; status?: string;
  amount_money?: SquareMoney; refund_ids?: string[];
};
type SquareRefund = { id?: string; payment_id?: string; status?: string; amount_money?: SquareMoney };

export async function POST(request: NextRequest) {
  if (Number(request.headers.get("content-length") || 0) > 2048)
    return NextResponse.json({ error: "request_too_large" }, { status: 413, headers });
  const raw = await request.text();
  if (raw.length > 2048) return NextResponse.json({ error: "request_too_large" }, { status: 413, headers });
  if (!signedByOpee(request, raw))
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });

  let obj: unknown;
  try { obj = JSON.parse(raw); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400, headers }); }
  const parsed = schema.safeParse(obj);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400, headers });
  const { purchaseId, providerOrderId, expectedAmountCents } = parsed.data;

  const location = process.env.COD3BLACK_SQUARE_LOCATION_ID;
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if ((process.env.SQUARE_ENVIRONMENT || "production").toLowerCase() !== "production" ||
      !location || !token || token.length < 20)
    return NextResponse.json({ error: "processor_not_configured" }, { status: 503, headers });

  try {
    const result = await square("/v2/orders/" + encodeURIComponent(providerOrderId), token) as { order?: SquareOrder };
    const order = result.order;
    if (!order || order.id !== providerOrderId ||
        order.location_id !== location || order.reference_id !== purchaseId ||
        order.metadata?.brand !== "COD3BLACK_AGENCY" ||
        order.metadata?.studio_product !== "OPEE_STUDIO_CREDITS" ||
        order.metadata?.studio_purchase_id !== purchaseId ||
        order.total_money?.currency !== "USD" ||
        order.total_money.amount !== expectedAmountCents ||
        order.line_items?.length !== 1 ||
        order.line_items[0]?.quantity !== "1" ||
        !order.line_items[0]?.name?.startsWith("Cod3Black Agency"))
      return NextResponse.json({ error: "not_a_verified_studio_order" }, { status: 404, headers });

    if (order.state === "CANCELED") return NextResponse.json({ ok: true, state: "cancelled", purchaseId }, { headers });
    const tenders = order.tenders || [];
    if (tenders.length === 0) return NextResponse.json({ ok: true, state: "awaiting_payment", purchaseId }, { headers });
    if (tenders.length !== 1)
      return NextResponse.json({ ok: true, state: "manual_review", reason: "multiple_tenders", purchaseId }, { headers });
    const paymentId = tenders[0].payment_id || tenders[0].id;
    if (!paymentId || !/^[A-Za-z0-9_-]{8,192}$/.test(paymentId))
      return NextResponse.json({ ok: true, state: "manual_review", reason: "missing_payment_reference", purchaseId }, { headers });

    const paymentResult = await square("/v2/payments/" + encodeURIComponent(paymentId), token) as { payment?: SquarePayment };
    const payment = paymentResult.payment;
    if (!payment || payment.id !== paymentId || payment.order_id !== providerOrderId ||
        payment.location_id !== location ||
        payment.amount_money?.amount !== expectedAmountCents || payment.amount_money.currency !== "USD")
      return NextResponse.json({ error: "payment_mismatch" }, { status: 409, headers });
    if (payment.status !== "COMPLETED")
      return NextResponse.json({ ok: true, state: "awaiting_payment", purchaseId }, { headers });

    const refundIds = payment.refund_ids || [];
    if (refundIds.length > 10)
      return NextResponse.json({ ok: true, state: "manual_review", reason: "too_many_refunds", purchaseId }, { headers });

    let refunded = 0;
    for (const id of refundIds) {
      if (!/^[A-Za-z0-9_-]{8,255}$/.test(id))
        return NextResponse.json({ ok: true, state: "manual_review", reason: "invalid_refund_reference", purchaseId }, { headers });
      const refundResult = await square("/v2/refunds/" + encodeURIComponent(id), token) as { refund?: SquareRefund };
      const refund = refundResult.refund;
      if (!refund || refund.id !== id || refund.payment_id !== paymentId ||
          refund.amount_money?.currency !== "USD" || !Number.isSafeInteger(refund.amount_money.amount))
        return NextResponse.json({ ok: true, state: "manual_review", reason: "refund_mismatch", purchaseId }, { headers });
      if (refund.status === "PENDING")
        return NextResponse.json({ ok: true, state: "refund_pending", purchaseId }, { headers });
      if (refund.status === "COMPLETED") refunded += refund.amount_money.amount!;
    }

    const state = refunded === 0 ? "paid" : refunded === expectedAmountCents ? "refunded" : "manual_review";
    return NextResponse.json({
      ok: true, state, purchaseId, providerOrderId, providerPaymentId: paymentId,
      verifiedAmountCents: expectedAmountCents, currency: "USD",
      completedRefundCents: refunded, evidenceSource: "square_live_api",
    }, { headers });
  } catch {
    return NextResponse.json({ error: "processor_lookup_unavailable" }, { status: 503, headers });
  }
}
