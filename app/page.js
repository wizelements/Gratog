export const dynamic = 'force-static';
export const revalidate = 300; // Revalidate every 5 minutes

export const metadata = {
  title: 'Taste of Gratitude | Weekly Market Preorders in Atlanta',
  description: 'Preorder fresh small-batch sea moss gels, lemonades, refreshers, shots, and market favorites for Saturday pickup at Taste of Gratitude farmers markets.',
  keywords: [
    'small-batch sea moss Atlanta',
    'Atlanta farmers market juices',
    'sea moss gel Atlanta',
    'fresh drinks Atlanta',
    'Taste of Gratitude preorder',
    'farmers market pickup Atlanta',
    'Taste of Gratitude events',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Taste of Gratitude | Weekly Market Preorders',
    description: 'Preorder fresh small-batch Taste of Gratitude products for Saturday farmers market pickup in the Atlanta area.',
    url: 'https://tasteofgratitude.shop',
    siteName: 'Taste of Gratitude',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Taste of Gratitude | Weekly Market Preorders',
    description: 'Preorder fresh small-batch products for Saturday farmers market pickup, and learn about upcoming delivery routes and event bookings.',
  },
};

/**
 * 🚀 Gratog Homepage - Static with ISR
 * 
 * CHANGELOG:
 * - 2026-05-14: Migrated to static generation with ISR
 * - Removed unstable_noStore() 
 * - Mobile detection moved to client component
 */

import { connectToDatabase } from '@/lib/db-optimized';
import { getStorefrontCatalogSnapshot } from '@/lib/storefront-products';
import { logger } from '@/lib/logger';
import { buildHomepageFaqSchema, buildHomepageOrganizationSchema } from '@/seo/schemas';
import HomePageClient from '@/components/home/HomePageClient';
import { getCurrentWeekRange } from '@/lib/menus/week-utils';

async function getHomepageCatalogData() {
  const snapshot = await getStorefrontCatalogSnapshot({});

  if (snapshot.isFallback) {
    logger.warn('HomePage', 'Homepage is using demo fallback products for initial render', {
      source: snapshot.source
    });
  }

  // 🎯 FILTER: Show all products that aren't explicitly unavailable
  const availableProducts = snapshot.products.filter(product => {
    if (product.available === false) return false;
    if (product.purchaseStatus === 'sold_out') return false;
    if (product.availability === 'sold_out') return false;
    if (product.squareEcomAvailable === false) return false;
    
    return true;
  });

  return {
    featuredProducts: availableProducts
  };
}



export default async function HomePage() {
  // Fetch data in parallel with caching
  const { featuredProducts } = await getHomepageCatalogData();

  const organizationSchema = buildHomepageOrganizationSchema();
  const faqSchema = buildHomepageFaqSchema();
  const { weekStart, weekEnd } = getCurrentWeekRange();

  return (
    <HomePageClient
      initialFeaturedProducts={featuredProducts}
      organizationSchema={organizationSchema}
      faqSchema={faqSchema}
      weekStart={weekStart}
      weekEnd={weekEnd}
    />
  );
}
