import { createHash } from 'crypto';
import { Product, DBProduct, DBVariant, DBImage, DBInventoryLevel, DBLink } from '@/types/product';

// Database connection (using existing MongoDB for now, will add Postgres option)
let db: any = null;

export async function getDatabase() {
  if (db) return db;
  
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  db = client.db(process.env.DB_NAME || 'taste_of_gratitude');
  return db;
}

// Hash generation for change detection
export function generateProductHash(product: Product): string {
  const normalized = {
    title: product.title,
    description: product.description,
    variants: product.variants.map(v => ({
      sku: v.sku,
      price_cents: v.price_cents,
      options: v.options
    })),
    images: product.images.map(i => ({ url: i.url, position: i.position }))
  };
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

// Product operations
export async function upsertProduct(product: Product, sourceId: string = 'tasteofgratitude'): Promise<string> {
  const database = await getDatabase();
  const hash = generateProductHash(product);
  const now = new Date();
  
  // Check if product exists
  const existing = await database.collection('products').findOne({
    source_id: sourceId,
    slug: product.slug
  });
  
  let productId: string;
  
  if (existing) {
    // Update if hash changed
    if (existing.hash !== hash) {
      await database.collection('products').updateOne(
        { _id: existing._id },
        {
          $set: {
            title: product.title,
            description: product.description,
            brand: product.brand,
            category: product.category,
            handle: product.handle,
            active: product.active,
            last_seen_at: now,
            version: existing.version + 1,
            hash
          }
        }
      );
    } else {
      // Just update last_seen_at
      await database.collection('products').updateOne(
        { _id: existing._id },
        { $set: { last_seen_at: now } }
      );
    }
    productId = existing._id.toString();
  } else {
    // Create new product
    const result = await database.collection('products').insertOne({
      slug: product.slug,
      title: product.title,
      description: product.description,
      brand: product.brand,
      category: product.category,
      handle: product.handle,
      source_id: sourceId,
      active: product.active,
      first_seen_at: now,
      last_seen_at: now,
      version: 1,
      hash
    });
    productId = result.insertedId.toString();
  }
  
  // Update variants
  await database.collection('variants').deleteMany({ product_id: productId });
  
  for (const variant of product.variants) {
    const variantResult = await database.collection('variants').insertOne({
      product_id: productId,
      sku: variant.sku,
      option_values: variant.options,
      price_cents: variant.price_cents,
      currency: variant.currency,
      compare_at_cents: variant.compare_at_cents
    });
    
    // Update inventory level
    await database.collection('inventory_levels').replaceOne(
      { variant_id: variantResult.insertedId.toString() },
      {
        variant_id: variantResult.insertedId.toString(),
        quantity: variant.availability === 'in_stock' ? 100 : variant.availability === 'low' ? 5 : 0,
        status: variant.availability,
        last_checked_at: now
      },
      { upsert: true }
    );
  }
  
  // Update images
  await database.collection('images').deleteMany({ product_id: productId });
  
  for (const image of product.images) {
    await database.collection('images').insertOne({
      product_id: productId,
      url: image.url,
      width: image.width,
      height: image.height,
      alt: image.alt,
      position: image.position
    });
  }
  
  // Update link tracking
  await database.collection('links').replaceOne(
    { product_id: productId },
    {
      product_id: productId,
      url: product.source_url,
      last_crawled_at: now,
      last_hash: hash,
      crawl_status: 'success'
    },
    { upsert: true }
  );
  
  // Log event
  await database.collection('events').insertOne({
    type: existing ? 'product_updated' : 'product_created',
    entity: 'product',
    entity_id: productId,
    payload: { slug: product.slug, hash, version: existing ? existing.version + 1 : 1 },
    created_at: now
  });
  
  return productId;
}

// Query operations
export async function queryCatalog(params: {
  q?: string;
  category?: string;
  in_stock?: string;
  limit: number;
  cursor?: string;
}): Promise<{ items: Product[]; nextCursor?: string; etag: string }> {
  const database = await getDatabase();
  
  const filter: any = { active: true };
  
  if (params.q) {
    filter.$text = { $search: params.q };
  }
  
  if (params.category) {
    filter.category = params.category;
  }
  
  const skip = params.cursor ? parseInt(params.cursor) : 0;
  
  const products = await database.collection('products')
    .find(filter)
    .sort({ last_seen_at: -1 })
    .skip(skip)
    .limit(params.limit + 1)
    .toArray();
  
  const hasMore = products.length > params.limit;
  const items = hasMore ? products.slice(0, -1) : products;
  
  // Enrich with variants and images
  const enrichedProducts: Product[] = [];
  
  for (const product of items) {
    const variants = await database.collection('variants').find({ product_id: product._id.toString() }).toArray();
    const images = await database.collection('images').find({ product_id: product._id.toString() }).sort({ position: 1 }).toArray();
    
    // Get inventory levels for variants
    const enrichedVariants = [];
    for (const variant of variants) {
      const inventory = await database.collection('inventory_levels').findOne({ variant_id: variant._id.toString() });
      enrichedVariants.push({
        sku: variant.sku,
        options: variant.option_values,
        price_cents: variant.price_cents,
        currency: variant.currency,
        compare_at_cents: variant.compare_at_cents,
        availability: inventory?.status || 'unknown'
      });
    }
    
    enrichedProducts.push({
      slug: product.slug,
      title: product.title,
      description: product.description,
      brand: product.brand,
      category: product.category,
      images: images.map(img => ({
        url: img.url,
        width: img.width,
        height: img.height,
        alt: img.alt,
        position: img.position
      })),
      variants: enrichedVariants,
      source_url: '', // We'll get this from links if needed
      handle: product.handle,
      active: product.active
    });
  }
  
  const nextCursor = hasMore ? (skip + params.limit).toString() : undefined;
  const etag = createHash('md5').update(JSON.stringify(items.map(p => p.hash))).digest('hex');
  
  return { items: enrichedProducts, nextCursor, etag };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const database = await getDatabase();
  
  const product = await database.collection('products').findOne({ slug, active: true });
  if (!product) return null;
  
  const variants = await database.collection('variants').find({ product_id: product._id.toString() }).toArray();
  const images = await database.collection('images').find({ product_id: product._id.toString() }).sort({ position: 1 }).toArray();
  const link = await database.collection('links').findOne({ product_id: product._id.toString() });
  
  // Enrich variants with inventory
  const enrichedVariants = [];
  for (const variant of variants) {
    const inventory = await database.collection('inventory_levels').findOne({ variant_id: variant._id.toString() });
    enrichedVariants.push({
      sku: variant.sku,
      options: variant.option_values,
      price_cents: variant.price_cents,
      currency: variant.currency,
      compare_at_cents: variant.compare_at_cents,
      availability: inventory?.status || 'unknown'
    });
  }
  
  return {
    slug: product.slug,
    title: product.title,
    description: product.description,
    brand: product.brand,
    category: product.category,
    images: images.map(img => ({
      url: img.url,
      width: img.width,
      height: img.height,
      alt: img.alt,
      position: img.position
    })),
    variants: enrichedVariants,
    source_url: link?.url || '',
    handle: product.handle,
    active: product.active
  };
}

export async function getHealthMetrics(): Promise<any> {
  const database = await getDatabase();
  
  const [totalProducts, totalVariants, recentCrawls, oldestCrawl] = await Promise.all([
    database.collection('products').countDocuments({ active: true }),
    database.collection('variants').countDocuments(),
    database.collection('links').find({ crawl_status: 'success', last_crawled_at: { $gte: new Date(Date.now() - 60 * 60 * 1000) } }).count(),
    database.collection('links').findOne({}, { sort: { last_crawled_at: 1 } })
  ]);
  
  const totalCrawls = await database.collection('links').countDocuments();
  const crawlSuccessRate = totalCrawls > 0 ? (recentCrawls / totalCrawls) * 100 : 100;
  
  const unknownStock = await database.collection('inventory_levels').countDocuments({ status: 'unknown' });
  const totalStock = await database.collection('inventory_levels').countDocuments();
  const unknownStockPercentage = totalStock > 0 ? (unknownStock / totalStock) * 100 : 0;
  
  const oldestCrawlMinutes = oldestCrawl?.last_crawled_at 
    ? Math.floor((Date.now() - oldestCrawl.last_crawled_at.getTime()) / (1000 * 60))
    : 0;
  
  return {
    total_products: totalProducts,
    total_variants: totalVariants,
    crawl_success_rate: crawlSuccessRate,
    avg_freshness_minutes: oldestCrawlMinutes,
    unknown_stock_percentage: unknownStockPercentage,
    oldest_crawl_minutes: oldestCrawlMinutes,
    pending_crawls: await database.collection('links').countDocuments({ crawl_status: 'pending' })
  };
}
