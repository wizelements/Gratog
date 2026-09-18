export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Weekly Menu | Taste of Gratitude Farmers Market Pickup',
  description: 'Get the fresh weekly sea moss gels, lemonades, refreshers, and shots menu for Atlanta farmers market pickup. Drop your email to get the menu before market day.',
  alternates: { canonical: '/weekly-menu' },
};

import WeeklyMenuPage from '@/components/weekly-menu/WeeklyMenuPage';
import { getActiveMarketPickups } from '@/data/markets';
import { buildWeeklyMenu, getWeeklyMenuProducts } from '@/data/weeklyMenu';
import { getActiveMenu } from '@/lib/menus/repository';
import { getCurrentWeekRange } from '@/lib/menus/week-utils';
import { filterDisplayableProducts } from '@/lib/product-eligibility';
import { listStorefrontProducts } from '@/lib/repositories/storefront-catalog';
import { validateStorefrontProducts } from '@/lib/storefront-integrity';

export default async function WeeklyMenuLandingPage() {
  const markets = getActiveMarketPickups();
  const { weekStart, weekEnd } = getCurrentWeekRange();

  let weeklyMenu = buildWeeklyMenu(weekStart, weekEnd);
  let weeklyProducts: any[] = filterDisplayableProducts(
    getWeeklyMenuProducts('all')
  ).slice(0, 9);

  try {
    const publishedMenu = await getActiveMenu();
    const current = Boolean(
      publishedMenu &&
      new Date(publishedMenu.weekStart) <= new Date(weekEnd) &&
      new Date(publishedMenu.weekEnd) >= new Date(weekStart)
    );

    if (publishedMenu && current && publishedMenu.linkedProducts?.length) {
      const catalog = await listStorefrontProducts();
      const integrity = validateStorefrontProducts(catalog);
      const byId = new Map(
        integrity.validProducts.map((product: any) => [String(product.id), product])
      );
      const selected = publishedMenu.linkedProducts
        .map((id) => byId.get(String(id)))
        .filter((product: any) =>
          product &&
          Number(product.price) > 0 &&
          Array.isArray(product.variations) &&
          product.variations.length > 0
        )
        .map((product: any) => ({
          id: String(product.id),
          slug: product.slug || undefined,
          name: String(product.name),
          category: product.category || undefined,
          price: Number(product.price),
          image: product.image || undefined,
          shortDescription: product.description || undefined,
        }));

      if (selected.length > 0) {
        weeklyProducts = selected.slice(0, 9);
        weeklyMenu = {
          ...buildWeeklyMenu(publishedMenu.weekStart, publishedMenu.weekEnd),
          title: publishedMenu.title,
        };
      }
    }
  } catch {
    // Fail safe: curated current-week fallback remains customer-facing.
  }

  return (
    <WeeklyMenuPage
      markets={markets}
      weeklyProducts={weeklyProducts}
      weeklyMenu={weeklyMenu}
    />
  );
}
