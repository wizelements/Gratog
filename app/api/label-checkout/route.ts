import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createPaymentLink } from '@/lib/square-api';
import { normalizeLabelQuantity, resolveLabelProduct } from '@/lib/label-commerce';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function siteOrigin(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');
  if (configured) return configured;
  return new URL(request.url).origin;
}

function safeMarket(value: FormDataEntryValue | null) {
  const normalized = String(value || '').trim().slice(0, 80);
  return normalized || undefined;
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const slug = String(form.get('slug') || '').trim();
  const quantity = normalizeLabelQuantity(form.get('quantity'));
  const market = safeMarket(form.get('market'));

  const resolved = resolveLabelProduct(slug);
  if (!resolved.payable || !resolved.product) {
    const fallbackSlug = resolved.product?.slug || slug;
    const destination = fallbackSlug
      ? new URL(`/q/${encodeURIComponent(fallbackSlug)}?error=unavailable`, request.url)
      : new URL('/weekly-menu?source=label', request.url);
    return NextResponse.redirect(destination, 303);
  }

  const product = resolved.product;
  const origin = siteOrigin(request);
  const referenceId = `LQR-${product.slug.slice(0, 18)}-${randomUUID().slice(0, 8)}`;

  const result = await createPaymentLink({
    referenceId,
    description: `Taste of Gratitude label purchase: ${product.name}`,
    redirectUrl: `${origin}/q/${encodeURIComponent(product.slug)}?paid=1`,
    lineItems: [
      {
        name: product.name,
        quantity: String(quantity),
        basePriceMoney: {
          amount: product.priceCents,
          currency: 'USD',
        },
        note: `${product.size} · QR label purchase`,
      },
    ],
    metadata: {
      source: 'label_qr',
      product_slug: product.slug,
      market,
      label_flow: 'v1',
    },
  });

  const paymentUrl = result.data?.paymentLink?.url;
  if (!result.success || !paymentUrl) {
    console.error('[Label Checkout] Square payment link creation failed', {
      slug: product.slug,
      quantity,
      errors: result.errors?.map((error) => ({
        category: error.category,
        code: error.code,
        detail: error.detail,
      })),
    });

    return NextResponse.redirect(
      new URL(`/q/${encodeURIComponent(product.slug)}?error=payment`, request.url),
      303,
    );
  }

  return NextResponse.redirect(paymentUrl, 303);
}
