export const dynamic = 'force-static';
export const revalidate = 300; // Revalidate every 5 minutes

export const metadata = {
  title: 'Taste of Gratitude | Weekly Sea Moss Menu & Atlanta Farmers Market Wellness',
  description: 'Shop small-batch sea moss gels, wellness drinks, refreshers, and shots from Taste of Gratitude. Weekly menu drops for Atlanta farmers market pickup.',
  keywords: [
    'small-batch sea moss Atlanta',
    'Atlanta farmers market juices',
    'wildcrafted sea moss gel Atlanta',
    'wellness drinks Atlanta',
    'Taste of Gratitude weekly menu',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Taste of Gratitude | Weekly Sea Moss Market Menu',
    description: 'Fresh weekly sea moss gels, lemonades, refreshers, and wellness shots for Atlanta market pickup.',
    url: 'https://tasteofgratitude.shop',
    siteName: 'Taste of Gratitude',
    images: [{ url: '/images/gratog-bg.PNG', width: 1200, height: 630, alt: 'Taste of Gratitude weekly market wellness products' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Taste of Gratitude | Weekly Sea Moss Market Menu',
    description: 'Small-batch sea moss gels and wellness drinks for Atlanta farmers market pickup.',
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
import { PUBLIC_REVIEW_FILTER } from '@/lib/review-visibility';
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
    featuredProducts: availableProducts,
    initialCatalogCount: snapshot.isFallback ? null : availableProducts.length
  };
}

async function getSocialProof() {
  const fallback = {
    customers: null,
    reviews: null,
    averageRating: null
  };

  try {
    const { db } = await connectToDatabase();

    const [reviewAggregate, uniqueCustomerCount] = await Promise.all([
      db.collection('product_reviews').aggregate([
        { $match: { ...PUBLIC_REVIEW_FILTER } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            reviewCount: { $sum: 1 }
          }
        }
      ]).toArray(),
      db.collection('orders').distinct('customer.email', {
        status: { $in: ['paid', 'completed', 'delivered', 'fulfilled'] }
      })
    ]);

    const aggregate = reviewAggregate[0] || {};
    const reviews = Number(aggregate.reviewCount || 0);
    const averageRating = Number(aggregate.averageRating || 0);
    const customers = Array.isArray(uniqueCustomerCount) ? uniqueCustomerCount.length : 0;

    return {
      customers: customers > 0 ? `${customers.toLocaleString()}+` : null,
      reviews: reviews > 0 ? `${reviews.toLocaleString()}+` : null,
      averageRating: averageRating > 0 ? `${averageRating.toFixed(1)} / 5.0` : fallback.averageRating
    };
  } catch (error) {
    logger.warn('HomePage', 'Failed to fetch social-proof aggregates', {
      error: error instanceof Error ? error.message : String(error)
    });
    return fallback;
  }
}

async function getFeaturedReviews() {
  try {
    const { db } = await connectToDatabase();
    const reviews = await db.collection('product_reviews')
      .find({ ...PUBLIC_REVIEW_FILTER })
      .sort({ helpful: -1, createdAt: -1 })
      .limit(3)
      .project({ name: 1, rating: 1, comment: 1, verifiedPurchase: 1, createdAt: 1 })
      .toArray();

    return reviews.map(r => ({
      name: r.name,
      rating: r.rating,
      comment: r.comment,
      verifiedPurchase: r.verifiedPurchase || false,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null
    }));
  } catch (error) {
    logger.warn('HomePage', 'Failed to fetch featured reviews', {
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
}

export default async function HomePage() {
  // Fetch data in parallel with caching
  const [{ featuredProducts, initialCatalogCount }, socialProof, featuredReviews] = await Promise.all([
    getHomepageCatalogData(),
    getSocialProof(),
    getFeaturedReviews(),
  ]);

  const organizationSchema = buildHomepageOrganizationSchema();
  const faqSchema = buildHomepageFaqSchema();

  return (
    <HomePageClient
      initialFeaturedProducts={featuredProducts}
      initialCatalogCount={initialCatalogCount}
      organizationSchema={organizationSchema}
      faqSchema={faqSchema}
      socialProof={socialProof}
      featuredReviews={featuredReviews}
    />
  );
}
