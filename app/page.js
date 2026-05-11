export const dynamic = 'force-dynamic';

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
import { PUBLIC_REVIEW_FILTER } from '@/lib/review-visibility';
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

  // 🎯 FILTER: Only show products that are available for purchase (in stock OR preorder-available)
  // Filter OUT completely unavailable products (stock = 0 and not preorder-eligible)
  const availableProducts = snapshot.products.filter(product => {
    const stock = product.stock ?? product.currentStock ?? null;
    const isPreorder = product.isPreorder ?? (stock !== null && stock <= 0);
    
    // Allow products that are: 1) In stock (stock > 0), OR 2) Preorder-eligible (marked as preorder)
    // Filter out products that are explicitly marked as unavailable or sold out permanently
    if (product.available === false) return false;
    if (product.purchaseStatus === 'sold_out' || product.availability === 'sold_out') return false;
    if (product.isPreorder === false && stock === 0) return false; // Truly sold out, not preorder
    
    // Otherwise, show it (in stock or preorder)
    return true;
  });

  return {
    featuredProducts: availableProducts.slice(0, 6),
    initialCatalogCount: snapshot.isFallback ? null : availableProducts.length
  };
}

async function getSocialProof() {
  const fallback = {
    customers: 'Growing Daily',
    reviews: 'Fresh Feedback',
    averageRating: '4.9 / 5.0'
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
      customers: customers > 0 ? `${customers.toLocaleString()}+` : fallback.customers,
      reviews: reviews > 0 ? `${reviews.toLocaleString()}+` : fallback.reviews,
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
  // 🔥 MOBILE EXPERIENCE: Show full site for all users now
  // Mobile users get a sticky "Quick Order" button instead of instant redirect
  const headersList = headers();
  const userAgent = headersList.get('user-agent') || '';
  
  // Detect if mobile for conditional UI enhancements
  const isMobile = isMobileDevice(userAgent);

  const [{ featuredProducts, initialCatalogCount }, socialProof, featuredReviews] = await Promise.all([
    getHomepageCatalogData(),
    getSocialProof(),
    getFeaturedReviews()
  ]);

  const organizationSchema = buildHomepageOrganizationSchema();
  const faqSchema = buildHomepageFaqSchema();

  return (
    <>
      <LiveLocationBanner />
      <HomePageClient
        initialFeaturedProducts={featuredProducts}
        initialCatalogCount={initialCatalogCount}
        organizationSchema={organizationSchema}
        faqSchema={faqSchema}
        socialProof={socialProof}
        featuredReviews={featuredReviews}
        isMobile={isMobile}
      />
    </>
  );
}
