export const dynamic = 'force-static';
export const revalidate = 300; // Revalidate every 5 minutes

export const metadata = {
  title: 'Taste of Gratitude | Weekly Sea Moss Menu & Atlanta Farmers Market Fresh Drinks',
  description: 'Shop small-batch sea moss gels, fresh drinks, refreshers, and shots from Taste of Gratitude. Weekly menu drops for Atlanta farmers market pickup.',
  keywords: [
    'small-batch sea moss Atlanta',
    'Atlanta farmers market juices',
    'sea moss gel Atlanta',
    'fresh drinks Atlanta',
    'Taste of Gratitude weekly menu',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Taste of Gratitude | Weekly Sea Moss Market Menu',
    description: 'Fresh weekly sea moss gels, lemonades, refreshers, and shots for Atlanta market pickup.',
    url: 'https://tasteofgratitude.shop',
    siteName: 'Taste of Gratitude',
    images: [{ url: '/images/gratog-bg.PNG', width: 1200, height: 630, alt: 'Taste of Gratitude weekly market fresh products' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Taste of Gratitude | Weekly Sea Moss Market Menu',
    description: 'Small-batch sea moss gels and fresh drinks for Atlanta farmers market pickup.',
    images: ['/images/gratog-bg.PNG'],
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

  return (
    <HomePageClient
      initialFeaturedProducts={featuredProducts}
      organizationSchema={organizationSchema}
      faqSchema={faqSchema}
    />
  );
}
