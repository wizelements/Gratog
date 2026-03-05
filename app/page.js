import HomePageClient from '@/components/home/HomePageClient';
import { connectToDatabase } from '@/lib/db-optimized';
import { getDemoProducts } from '@/lib/demo-products';
import { getUnifiedProducts } from '@/lib/product-sync-engine';
import { logger } from '@/lib/logger';
import { buildHomepageFaqSchema, buildHomepageOrganizationSchema } from '@/seo/schemas';

export const revalidate = 300;

async function getFeaturedProducts() {
  try {
    const products = await getUnifiedProducts({});
    if (Array.isArray(products) && products.length > 0) {
      return products.slice(0, 6);
    }
  } catch (error) {
    logger.warn('HomePage', 'Failed to fetch featured products for server render', {
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return getDemoProducts().slice(0, 6);
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
        { $match: { approved: true, hidden: false } },
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

export default async function HomePage() {
  const [featuredProducts, socialProof] = await Promise.all([
    getFeaturedProducts(),
    getSocialProof()
  ]);

  return (
    <HomePageClient
      initialFeaturedProducts={featuredProducts}
      socialProof={socialProof}
      organizationSchema={buildHomepageOrganizationSchema()}
      faqSchema={buildHomepageFaqSchema()}
    />
  );
}
