export const dynamic = 'force-static';
export const revalidate = 300; // Revalidate every 5 minutes

export const metadata = {
  title: 'Taste of Gratitude | Fresh Georgia Drinks & Sea Moss',
  description: 'Handcrafted sea moss gels, lemonades and fresh market drinks. Currently accepting Georgia orders only, with local market pickup and eligible in-state fulfillment.',
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
    title: 'Shop Taste of Gratitude | Georgia Drinks & Sea Moss',
    description: 'Taste of Gratitude makes small-batch market favorites for Georgia customers. Georgia orders only, with scheduled pickup and eligible delivery or shipping.',
    url: 'https://tasteofgratitude.shop',
    siteName: 'Taste of Gratitude',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Shop Taste of Gratitude | Georgia Drinks & Sea Moss',
    description: 'Shop fresh sea moss and drinks for pickup at Georgia markets, with eligible in-state fulfillment. Georgia orders only.',
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
import { selectHomepageCheckoutProducts } from '@/lib/homepage-merchandising';

async function getHomepageCatalogData() {
  const snapshot = await getStorefrontCatalogSnapshot({});

  if (snapshot.isFallback) {
    logger.warn('HomePage', 'Homepage is using demo fallback products for initial render', {
      source: snapshot.source
    });
  }

  return {
    featuredProducts: selectHomepageCheckoutProducts(snapshot),
  };
}



export default async function HomePage() {
  // Fetch data in parallel with caching
  const { featuredProducts } = await getHomepageCatalogData();

  const organizationSchema = buildHomepageOrganizationSchema();
  const faqSchema = buildHomepageFaqSchema();

  return (
    <HomePageClient
      initialFeaturedProducts={featuredProducts}
      organizationSchema={organizationSchema}
      faqSchema={faqSchema}
    />
  );
}
