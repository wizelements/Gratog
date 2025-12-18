// Optimized database connection with pooling and caching
import { MongoClient } from 'mongodb';
import { logger } from '@/lib/logger';

const MONGO_URL = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DATABASE_NAME || process.env.DB_NAME || 'taste_of_gratitude';

// Global connection cache
let cachedClient = null;
let cachedDb = null;

// Connection pool options for production performance
const clientOptions = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  // bufferMaxEntries: 0, // Removed - not supported in current MongoDB driver
  connectTimeoutMS: 10000,
  maxIdleTimeMS: 30000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true
};

export async function connectToDatabase() {
  // Return cached connection if available
  if (cachedClient && cachedDb) {
    try {
      // Verify connection is still alive
      await cachedDb.admin().ping();
      return { client: cachedClient, db: cachedDb };
    } catch (pingError) {
      logger.warn('Cached connection failed ping, reconnecting', pingError);
      cachedClient = null;
      cachedDb = null;
    }
  }

  try {
    if (!MONGO_URL) {
      throw new Error('MONGODB_URI or MONGO_URL environment variable is not set');
    }
    
    logger.info('Connecting to database', {
      url: MONGO_URL.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'),
      database: DB_NAME
    });
    
    // Create new client with optimized settings
    const client = new MongoClient(MONGO_URL, clientOptions);
    await client.connect();
    
    const db = client.db(DB_NAME);
    
    // Verify connection with ping
    await db.admin().ping();
    
    // Cache the connections
    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name
    });
    
    // Reset cache on connection failure
    cachedClient = null;
    cachedDb = null;
    
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

// Performance-optimized queries with caching
const queryCache = new Map();
const CACHE_TTL = 60000; // 1 minute cache

export async function getCachedQuery(key, queryFn, ttl = CACHE_TTL) {
  // Check cache first
  const cached = queryCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < ttl) {
    return cached.data;
  }
  
  // Execute query
  const data = await queryFn();
  
  // Cache result
  queryCache.set(key, {
    data,
    timestamp: Date.now()
  });
  
  // Clean up old cache entries
  if (queryCache.size > 100) {
    const cutoff = Date.now() - ttl * 2;
    for (const [k, v] of queryCache.entries()) {
      if (v.timestamp < cutoff) {
        queryCache.delete(k);
      }
    }
  }
  
  return data;
}

// Optimized product queries
export async function getProductsOptimized() {
  return getCachedQuery('all_products', async () => {
    const { db } = await connectToDatabase();
    return await db.collection('products')
      .find({}, { 
        projection: { 
          _id: 0, // Exclude MongoDB ObjectId for better JSON serialization
          id: 1, 
          name: 1, 
          price: 1, 
          image: 1, 
          stock: 1,
          featured: 1,
          description: 1
        }
      })
      .sort({ featured: -1, createdAt: -1 })
      .toArray();
  }, 300000); // Cache for 5 minutes
}

export async function getProductByIdOptimized(productId) {
  return getCachedQuery(`product_${productId}`, async () => {
    const { db } = await connectToDatabase();
    return await db.collection('products').findOne(
      { id: productId },
      { projection: { _id: 0 } }
    );
  }, 600000); // Cache for 10 minutes
}

// Optimized order creation with batching
export async function createOrderOptimized(orderData) {
  const { db } = await connectToDatabase();
  
  // Use write concern for better performance in production
  const result = await db.collection('orders').insertOne(orderData, {
    writeConcern: { w: 1, j: false } // Don't wait for journal sync for better performance
  });
  
  return result;
}

// Batch operations for better performance
export async function getBatchedOrders(limit = 50, skip = 0) {
  return getCachedQuery(`orders_${limit}_${skip}`, async () => {
    const { db } = await connectToDatabase();
    return await db.collection('orders')
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();
  }, 30000); // Cache for 30 seconds
}

// Analytics optimization
export async function getOrderAnalytics() {
  return getCachedQuery('order_analytics', async () => {
    const { db } = await connectToDatabase();
    
    const pipeline = [
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' }
        }
      }
    ];
    
    const result = await db.collection('orders').aggregate(pipeline).toArray();
    return result[0] || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 };
  }, 300000); // Cache for 5 minutes
}

// Connection cleanup for production
export async function closeConnection() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
    console.log('Database connection closed');
  }
}

// Handle process termination gracefully
process.on('SIGINT', closeConnection);
process.on('SIGTERM', closeConnection);

// Default export for legacy imports
const dbExport = { connectToDatabase };
export default dbExport;