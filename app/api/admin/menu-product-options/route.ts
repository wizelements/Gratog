export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { requireAdminSession } from '@/lib/auth/unified-admin';
import { listStorefrontProducts } from '@/lib/repositories/storefront-catalog';

export async function GET(request: NextRequest) {
  const session = await requireAdminSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    await requireAdmin(request);
    const products = await listStorefrontProducts();
    const options = products
      .filter((product: any) => product?.id && product?.name)
      .map((product: any) => ({
        id: String(product.id),
        slug: product.slug ? String(product.slug) : undefined,
        name: String(product.name),
        price: Number(product.price || 0),
        image: product.image || undefined,
        checkoutReady: Array.isArray(product.variations) && product.variations.length > 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      products: options,
      count: options.length,
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to load menu product options' },
      { status: 500 }
    );
  }
}
