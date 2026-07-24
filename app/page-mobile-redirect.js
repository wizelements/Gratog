/**
 * 🚀 Gratog Mobile Homepage
 * Detects mobile and redirects to /pay flow
 * 
 * REPLACE app/page.js with this version
 * or add mobile detection to existing page
 */

import { LiveLocationBanner } from '@/components/market/LiveLocationBanner';
import { connectToDatabase } from '@/lib/db-optimized';
import { getStorefrontCatalogSnapshot } from '@/lib/storefront-products';
import { logger } from '@/lib/logger';
import { buildHomepageFaqSchema, buildHomepageOrganizationSchema } from '@/seo/schemas';
import HomePageClient from '@/components/home/HomePageClient';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export const revalidate = 300;

/**
 * Detect mobile devices
 */
function isMobileDevice(userAgent) {
  if (!userAgent) return false;
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i;
  return mobileRegex.test(userAgent);
}

async function getHomepageCatalogData() {
  const snapshot = await getStorefrontCatalogSnapshot({});

  if (snapshot.isFallback) {
    logger.warn('HomePage', 'Homepage is using demo fallback products for initial render', {
      source: snapshot.source
    });
  }

  return {
    featuredProducts: snapshot.products
  };
}



export default async function HomePage() {
  // Mobile users go to the implemented checkout path, not retired payment routes.
  const headersList = headers();
  const userAgent = headersList.get('user-agent') || '';
  
  if (isMobileDevice(userAgent)) {
    redirect('/checkout');
  }

  // Desktop: Show full site
  const { featuredProducts } = await getHomepageCatalogData();

  const organizationSchema = buildHomepageOrganizationSchema();
  const faqSchema = buildHomepageFaqSchema();

  return (
    <>
      <LiveLocationBanner />
      <HomePageClient
        initialFeaturedProducts={featuredProducts}
        organizationSchema={organizationSchema}
        faqSchema={faqSchema}
      />
    </>
  );
}
