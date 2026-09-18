import {
  getActiveWeeklyProducts,
  getBestSellerProducts,
  getCategoryIcon,
  getCategoryLabel,
  getProductsByCategory,
  type ProductCategory,
} from './products';
import { formatWeekRange as formatWeekRangeInZone } from '@/lib/menus/week-utils';

export function formatWeekRange(startIso: string, endIso: string): string {
  return formatWeekRangeInZone(startIso, endIso);
}

export function buildWeeklyMenu(weekStart: string, weekEnd: string) {
  return {
    id: 'current-weekly-market-menu',
    title: "This Week's Market Menu",
    eyebrow: 'Fresh weekly drop • small-batch preorder',
    weekStart,
    weekEnd,
    dateRange: formatWeekRange(weekStart, weekEnd),
    preorderLanguage: 'Preorder early in the week, choose your market pickup window, and pick up fresh while batches last.',
    pickupLanguage: 'Primary fulfillment is Atlanta-area market pickup. Shipping eligibility is confirmed per item at checkout.',
    activeWeeklyMenu: true,
  };
}

export const WEEKLY_MENU_CATEGORIES: Array<{ id: ProductCategory | 'all'; label: string; icon: string }> = [
  { id: 'all', label: 'All weekly items', icon: '✨' },
  { id: 'lemonades', label: getCategoryLabel('lemonades'), icon: getCategoryIcon('lemonades') },
  { id: 'refreshers', label: getCategoryLabel('refreshers'), icon: getCategoryIcon('refreshers') },
  { id: 'gels', label: getCategoryLabel('gels'), icon: getCategoryIcon('gels') },
  { id: 'shots', label: getCategoryLabel('shots'), icon: getCategoryIcon('shots') },
];

export function getWeeklyMenuProducts(category: ProductCategory | 'all' = 'all') {
  const products = getActiveWeeklyProducts();
  if (category === 'all') return products;
  return products.filter((product) => product.category === category);
}

export function getWeeklyMenuCategoryCounts() {
  return WEEKLY_MENU_CATEGORIES.map((category) => ({
    ...category,
    count: category.id === 'all'
      ? getActiveWeeklyProducts().length
      : getProductsByCategory(category.id).filter((product) => product.activeWeeklyMenu).length,
  }));
}

export function getHomepageBestSellers() {
  return getBestSellerProducts();
}
