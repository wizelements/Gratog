import { notFound } from 'next/navigation';
import { connectToDatabase } from '@/lib/db-optimized';
import { UNIFIED_PRODUCTS_COLLECTION } from '@/lib/product-sync-engine';
import ProductDetailClient from './ProductDetailClient';
import {
  getProductBySlugOrId,
  mergeWithCuratedProduct,
  toStorefrontProduct,
} from '@/data/products';

function buildSlugFilter(slug) {
  return {
    $or: [
      { slug: slug },
      { slug: { $regex: slug, $options: 'i' } },
      { id: slug }
    ]
  };
}

async function findProductBySlug(db, slug) {
  const filter = buildSlugFilter(slug);
  // Try unified_products first (where catalog sync writes), then fall back to products
  let product = await db.collection(UNIFIED_PRODUCTS_COLLECTION).findOne(filter);
  if (!product) {
    product = await db.collection('products').findOne(filter);
  }
  return product;
}

const PRODUCT_COPY_FALLBACK = 'Small-batch sea moss gel made with simple ingredients and market pickup options.';
const STORAGE_COPY_FALLBACK = 'Keep refrigerated. Use a clean spoon each time and follow the freshness window on the label.';

const PRODUCT_CLAIM_PATTERNS = [
  /\b92\s+(?:essential\s+)?minerals?\b/i,
  /\b(?:cure|treat|prevent|heal)\b/i,
  /\b(?:arthritis|diabetes|cancer|blood pressure|thyroid disease)\b/i,
];

function safeProductCopy(value, fallback = PRODUCT_COPY_FALLBACK) {
  if (typeof value !== 'string') return fallback;

  const copy = value.trim();
  if (!copy) return fallback;

  return PRODUCT_CLAIM_PATTERNS.some((pattern) => pattern.test(copy)) ? fallback : copy;
}

function serializeVariation(variation) {
  const price = variation.price ?? (typeof variation.priceCents === 'number' ? variation.priceCents / 100 : undefined);

  return {
    id: variation.id || variation.variationId || variation.catalogObjectId,
    name: variation.name || variation.label || variation.size || 'Default',
    price,
    priceCents: variation.priceCents,
    sku: variation.sku,
    stock: variation.stock,
  };
}

function serializeIngredient(ingredient) {
  if (typeof ingredient === 'string') {
    return { name: ingredient };
  }

  return {
    name: ingredient.name,
    icon: ingredient.icon,
    source: safeProductCopy(ingredient.source, ''),
    notes: safeProductCopy(ingredient.notes, ''),
    description: safeProductCopy(ingredient.description, ''),
  };
}

function serializeProductForClient(sourceProduct) {
  const product = mergeWithCuratedProduct(sourceProduct);
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const variations = Array.isArray(product.variations) ? product.variations.map(serializeVariation) : [];
  const ingredients = Array.isArray(product.ingredients)
    ? product.ingredients.map(serializeIngredient).filter((ingredient) => ingredient.name)
    : [];
  const productId = product.id || product._id?.toString() || product.slug;
  const price = product.price ?? (typeof product.priceCents === 'number' ? product.priceCents / 100 : undefined);

  return {
    _id: product._id?.toString(),
    id: productId,
    slug: product.slug || productId,
    name: product.name,
    category: product.category,
    categoryLabel: product.categoryLabel,
    displayCategory: product.displayCategory,
    intelligentCategory: product.intelligentCategory,
    categoryData: product.categoryData,
    description: safeProductCopy(product.shortDescription || product.description),
    shortDescription: safeProductCopy(product.shortDescription, ''),
    fullDescription: safeProductCopy(product.fullDescription || product.productStory || product.story || product.description, ''),
    productStory: safeProductCopy(product.productStory || product.story, ''),
    story: safeProductCopy(product.story, ''),
    howToUse: safeProductCopy(product.howToUse || product.usageInstructions, ''),
    usageInstructions: safeProductCopy(product.usageInstructions, ''),
    intendedUse: safeProductCopy(product.intendedUse, ''),
    customerQuote: safeProductCopy(product.customerQuote || product.testimonial, ''),
    testimonial: safeProductCopy(product.testimonial, ''),
    flavorNotes: safeProductCopy(product.flavorNotes || product.tastingNotes || product.flavorProfile || product.shortDescription || product.description),
    tastingNotes: safeProductCopy(product.tastingNotes, ''),
    flavorProfile: safeProductCopy(product.flavorProfile, ''),
    storageInstructions: safeProductCopy(product.storageInstructions || product.careInstructions, STORAGE_COPY_FALLBACK),
    careInstructions: safeProductCopy(product.careInstructions, STORAGE_COPY_FALLBACK),
    image: product.image,
    images,
    imageAlt: safeProductCopy(product.imageAlt, product.name),
    price,
    priceCents: product.priceCents,
    stock: product.stock,
    isPreorder: product.isPreorder,
    sku: product.sku,
    catalogObjectId: product.catalogObjectId,
    variationId: product.variationId,
    squareVariationId: product.squareVariationId,
    squareData: product.squareData?.variationId ? { variationId: product.squareData.variationId } : undefined,
    checkoutReady: product.checkoutReady,
    checkoutUnavailableReason: product.checkoutUnavailableReason,
    marketExclusive: product.marketExclusive,
    fulfillmentType: product.fulfillmentType,
    activeWeeklyMenu: product.activeWeeklyMenu,
    weeklyStatus: product.weeklyStatus,
    soldOut: product.soldOut,
    preorderOnly: product.preorderOnly,
    marketPickupOnly: product.marketPickupOnly,
    seasonal: product.seasonal,
    wellnessSupport: Array.isArray(product.wellnessSupport) ? product.wellnessSupport : [],
    recommendedUse: safeProductCopy(product.recommendedUse || product.howToUse || product.usageInstructions, ''),
    allergens: Array.isArray(product.allergens) ? product.allergens : [],
    pickupAvailability: safeProductCopy(product.pickupAvailability, ''),
    shippingAvailability: safeProductCopy(product.shippingAvailability, ''),
    inventoryStatus: product.inventoryStatus,
    pairings: Array.isArray(product.pairings) ? product.pairings : [],
    variations,
    ingredients,
    createdAt: product.createdAt?.toISOString?.() || product.createdAt,
    updatedAt: product.updatedAt?.toISOString?.() || product.updatedAt,
    syncedAt: product.syncedAt?.toISOString?.() || product.syncedAt,
  };
}

// Generate metadata for SEO
export async function generateMetadata({ params }) {
  const { slug } = await params;
  
  try {
    const { db } = await connectToDatabase();
    const curatedProduct = getProductBySlugOrId(slug);
    const product = await findProductBySlug(db, slug) || (curatedProduct ? toStorefrontProduct(curatedProduct) : null);
    
    if (!product) {
      return {
        title: 'Product Not Found | Taste of Gratitude',
        description: 'The product you\'re looking for could not be found.'
      };
    }
    
    const enrichedProduct = mergeWithCuratedProduct(product);
    const description = safeProductCopy(enrichedProduct.seoDescription || enrichedProduct.shortDescription || enrichedProduct.description).substring(0, 160);

    return {
      title: enrichedProduct.seoTitle || `${enrichedProduct.name} | Taste of Gratitude`,
      description,
      alternates: {
        canonical: `/product/${enrichedProduct.slug || slug}`,
      },
      openGraph: {
        title: enrichedProduct.name,
        description,
        images: enrichedProduct.images?.[0] || enrichedProduct.image ? [{ url: enrichedProduct.images?.[0] || enrichedProduct.image }] : []
      }
    };
  } catch (error) {
    console.error('[Product Metadata] Error:', error);
    const curatedProduct = getProductBySlugOrId(slug);
    if (curatedProduct) {
      return {
        title: curatedProduct.seoTitle,
        description: curatedProduct.seoDescription,
        alternates: { canonical: `/product/${curatedProduct.slug}` },
        openGraph: {
          title: curatedProduct.name,
          description: curatedProduct.seoDescription,
          images: [{ url: curatedProduct.image }]
        }
      };
    }
    return {
      title: 'Product | Taste of Gratitude',
      description: PRODUCT_COPY_FALLBACK
    };
  }
}

// Main SSR Page Component
export default async function ProductPage({ params }) {
  const { slug } = await params;
  
  if (!slug) {
    notFound();
  }
  
  try {
    const { db } = await connectToDatabase();
    
    // Fetch product from database (unified_products first, then products)
    const curatedProduct = getProductBySlugOrId(slug);
    const product = await findProductBySlug(db, slug) || (curatedProduct ? toStorefrontProduct(curatedProduct) : null);
    
    if (!product) {
      console.log(`[Product SSR] Product not found for slug: ${slug}`);
      // Return null to client, which will show "Product Not Found"
      return <ProductDetailClient product={null} slug={slug} />;
    }
    
    const serializedProduct = serializeProductForClient(product);
    
    console.log(`[Product SSR] Successfully loaded product: ${serializedProduct.name}`);
    
    return <ProductDetailClient product={serializedProduct} slug={slug} />;
    
  } catch (error) {
    console.error('[Product SSR] Error fetching product:', error);
    const curatedProduct = getProductBySlugOrId(slug);
    if (curatedProduct) {
      return <ProductDetailClient product={serializeProductForClient(toStorefrontProduct(curatedProduct))} slug={slug} />;
    }
    // Return null to show error state
    return <ProductDetailClient product={null} slug={slug} />;
  }
}

// Force dynamic rendering - fetch products at request time
export const revalidate = 0;
