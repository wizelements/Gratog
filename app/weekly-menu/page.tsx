export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Weekly Menu | Taste of Gratitude Farmers Market Pickup',
  description: 'Get the fresh weekly sea moss gels, lemonades, refreshers, and shots menu for Atlanta farmers market pickup. Drop your email or phone to get the menu text before market day.',
  alternates: { canonical: '/weekly-menu' },
};

import WeeklyMenuPage from '@/components/weekly-menu/WeeklyMenuPage';
import { getActiveMarketPickups } from '@/data/markets';
import { WEEKLY_MENU, getWeeklyMenuProducts } from '@/data/weeklyMenu';

export default async function WeeklyMenuLandingPage() {
  const markets = getActiveMarketPickups();
  const weeklyProducts = getWeeklyMenuProducts('all');

  return (
    <WeeklyMenuPage
      markets={markets}
      weeklyProducts={weeklyProducts.slice(0, 9)}
      weeklyMenu={WEEKLY_MENU}
    />
  );
}
