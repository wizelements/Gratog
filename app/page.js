import { LiveLocationBanner } from '@/components/market/LiveLocationBanner';
import { connectToDatabase } from '@/lib/db-optimized';
import { getStorefrontCatalogSnapshot } from '@/lib/storefront-products';
import { logger } from '@/lib/logger';
import { PUBLIC_REVIEW_FILTER } from '@/lib/review-visibility';
import { buildHomepageFaqSchema, buildHomepageOrganizationSchema } from '@/seo/schemas';
import HomePageClient from '@/components/home/HomePageClient';

export const revalidate = 300;

async function getHomepageCatalogData() {
  const snapshot = await getStorefrontCatalogSnapshot({});

  if (snapshot.isFallback) {
    logger.warn('HomePage', 'Homepage is using demo fallback products for initial render', {
      source: snapshot.source
    });
  }

  return {
    featuredProducts: snapshot.products.slice(0, 6),
    initialCatalogCount: snapshot.isFallback ? null : snapshot.totalCount
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
  const [{ featuredProducts, initialCatalogCount }, socialProof, featuredReviews] = await Promise.all([
    getHomepageCatalogData(),
    getSocialProof(),
    getFeaturedReviews()
  ]);

  return (
    <HomePageClient
      initialFeaturedProducts={featuredProducts}
      initialCatalogCount={initialCatalogCount}
      socialProof={socialProof}
      featuredReviews={featuredReviews}
      organizationSchema={buildHomepageOrganizationSchema()}
      faqSchema={buildHomepageFaqSchema()}
    />
  );
}
