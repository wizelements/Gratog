export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Weekly Menu | Taste of Gratitude Farmers Market Pickup',
  description: 'Explore this week’s lemonades, sea moss, and market favorites at Serenbe. Get the menu by email before your visit.',
  alternates: { canonical: '/weekly-menu' },
};

import WeeklyMenuPage from '@/components/weekly-menu/WeeklyMenuPage';
import { getActiveMarketPickups } from '@/data/markets';
import { buildWeeklyMenu, getWeeklyMenuProducts } from '@/data/weeklyMenu';
import { getCurrentWeekRange } from '@/lib/menus/week-utils';

export default async function WeeklyMenuLandingPage() {
  const markets = getActiveMarketPickups();
  const weeklyProducts = getWeeklyMenuProducts('all');
  const { weekStart, weekEnd } = getCurrentWeekRange();
  const weeklyMenu = buildWeeklyMenu(weekStart, weekEnd);

  return (
    <WeeklyMenuPage
      markets={markets}
      weeklyProducts={weeklyProducts.slice(0, 9)}
      weeklyMenu={weeklyMenu}
    />
  );
}
