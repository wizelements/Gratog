import { notFound } from 'next/navigation';
import { connectToDatabase } from '@/lib/db-optimized';
import ProductDetailClient from './ProductDetailClient';

// Generate metadata for SEO
export async function generateMetadata({ params }) {
  const { slug } = params;
  
  try {
    const { db } = await connectToDatabase();
    const product = await db.collection('products').findOne({
      $or: [
        { slug: slug },
        { slug: { $regex: slug, $options: 'i' } },
        { id: slug }
      ]
    });
    
    if (!product) {
      return {
        title: 'Product Not Found | Taste of Gratitude',
        description: 'The product you\'re looking for could not be found.'
      };
    }
    
    return {
      title: `${product.name} | Taste of Gratitude`,
      description: product.description?.substring(0, 160) || 'Premium wildcrafted sea moss gel with 92 essential minerals.',
      openGraph: {
        title: product.name,
        description: product.description?.substring(0, 160),
        images: product.images?.[0] || product.image ? [{ url: product.images?.[0] || product.image }] : []
      }
    };
  } catch (error) {
    console.error('[Product Metadata] Error:', error);
    return {
      title: 'Product | Taste of Gratitude',
      description: 'Premium wildcrafted sea moss gel.'
    };
  }
}

// Main SSR Page Component
export default async function ProductPage({ params }) {
  const { slug } = params;
  
  if (!slug) {
    notFound();
  }
  
  try {
    const { db } = await connectToDatabase();
    
    // Fetch product from database
    const product = await db.collection('products').findOne({
      $or: [
        { slug: slug },
        { slug: { $regex: slug, $options: 'i' } },
        { id: slug }
      ]
    });
    
    if (!product) {
      console.log(`[Product SSR] Product not found for slug: ${slug}`);
      // Return null to client, which will show "Product Not Found"
      return <ProductDetailClient product={null} slug={slug} />;
    }
    
    // Serialize the product for client-side use
    const serializedProduct = {
      ...product,
      _id: product._id?.toString(),
      createdAt: product.createdAt?.toISOString?.() || product.createdAt,
      updatedAt: product.updatedAt?.toISOString?.() || product.updatedAt,
      syncedAt: product.syncedAt?.toISOString?.() || product.syncedAt,
    };
    
    console.log(`[Product SSR] Successfully loaded product: ${serializedProduct.name}`);
    
    return <ProductDetailClient product={serializedProduct} slug={slug} />;
    
  } catch (error) {
    console.error('[Product SSR] Error fetching product:', error);
    // Return null to show error state
    return <ProductDetailClient product={null} slug={slug} />;
  }
}

// Generate static params for common products at build time
export async function generateStaticParams() {
  try {
    const { db } = await connectToDatabase();
    const products = await db.collection('products')
      .find({ status: { $ne: 'ARCHIVED' } })
      .limit(20)
      .toArray();
    
    return products.map(product => ({
      slug: product.slug || product.id
    }));
  } catch (error) {
    console.error('[Product SSR] Error generating static params:', error);
    return [];
  }
}
