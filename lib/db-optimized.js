// Optimized database connection with pooling and caching
import { MongoClient } from 'mongodb';
import { logger } from '@/lib/logger';

// Lazy-loaded config to avoid errors during build
let _mongoUrl = null;
let _dbName = null;

// Check if we're in build phase
const IS_BUILD_TIME = process.env.NEXT_PHASE === 'phase-production-build';

function getMongoUrl() {
  if (_mongoUrl) return _mongoUrl;
  
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL;
  const IS_PRODUCTION = process.env.NODE_ENV === 'production';
  const IS_VERCEL = !!process.env.VERCEL;
  
  if (!mongoUri) {
    if (IS_PRODUCTION || IS_VERCEL) {
      const errorMsg = 'MONGODB_URI or MONGO_URL environment variable is required in production. ' +
        'Add this to your Vercel project settings under Environment Variables.';
      logger.error('DB', errorMsg);
      throw new Error(errorMsg);
    }
    // Development fallback
    logger.warn('DB', 'No MongoDB URI configured, using localhost (development only)');
    _mongoUrl = 'mongodb://localhost:27017';
    return _mongoUrl;
  }
  
  // Validate URI format
  if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    const errorMsg = 'MONGODB_URI has invalid format. Must start with mongodb:// or mongodb+srv://';
    logger.error('DB', errorMsg);
    throw new Error(errorMsg);
  }
  
  _mongoUrl = mongoUri;
  return _mongoUrl;
}

function getDbName() {
  if (_dbName) return _dbName;
  
  const dbName = process.env.DATABASE_NAME || process.env.DB_NAME;
  const IS_PRODUCTION = process.env.NODE_ENV === 'production';
  const IS_VERCEL = !!process.env.VERCEL;
  
  if (!dbName) {
    // Allow build to proceed without DB config
    if (IS_BUILD_TIME) {
      _dbName = 'taste_of_gratitude';
      return _dbName;
    }
    if (IS_PRODUCTION || IS_VERCEL) {
      const errorMsg = 'DATABASE_NAME or DB_NAME environment variable is required in production. ' +
        'Add this to your Vercel project settings under Environment Variables.';
      logger.error('DB', errorMsg);
      throw new Error(errorMsg);
    }
    // Development fallback
    logger.warn('DB', 'DATABASE_NAME not set, using default "taste_of_gratitude" (development only)');
    _dbName = 'taste_of_gratitude';
    return _dbName;
  }
  
  _dbName = dbName;
  return _dbName;
}

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
    const mongoUrl = getMongoUrl();
    const dbName = getDbName();
    
    logger.info('DB', 'Connecting to database', {
      url: mongoUrl.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'),
      database: dbName,
      isProduction: process.env.NODE_ENV === 'production',
      isVercel: !!process.env.VERCEL
    });
    
    // Create new client with optimized settings
    const client = new MongoClient(mongoUrl, clientOptions);
    await client.connect();
    
    const db = client.db(dbName);
    
    // Verify connection with ping
    await db.admin().ping();
    
    logger.info('DB', 'Successfully connected to MongoDB', {
      database: dbName,
      host: client.options?.hosts?.[0] || 'unknown'
    });
    
    // Cache the connections
    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    logger.error('DB', 'Database connection failed', {
      error: error.message,
      code: error.code,
      name: error.name,
      isProduction: process.env.NODE_ENV === 'production',
      isVercel: !!process.env.VERCEL
    });
    
    // Reset cache on connection failure
    cachedClient = null;
    cachedDb = null;
    
    // Provide helpful error message
    let hint = '';
    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      hint = ' Check that the MongoDB hostname is correct.';
    } else if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
      hint = ' Check MongoDB Atlas IP whitelist (should include 0.0.0.0/0 for Vercel).';
    } else if (error.message.includes('Authentication') || error.message.includes('auth')) {
      hint = ' Check username/password in connection string.';
    }
    
    throw new Error(`Database connection failed: ${error.message}${hint}`);
  }
}

// Performance-optimized queries with caching
const queryCache = new Map();
const CACHE_TTL = 60000; // 1 minute cache
const MAX_CACHE_SIZE = 50; // MEMORY FIX: Reduced from unbounded to 50 entries

export async function getCachedQuery(key, queryFn, ttl = CACHE_TTL) {
  // Check cache first
  const cached = queryCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < ttl) {
    return cached.data;
  }
  
  // Execute query
  const data = await queryFn();
  
  // MEMORY FIX: Check cache size before adding
  if (queryCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry by timestamp
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [k, v] of queryCache.entries()) {
      if (v.timestamp < oldestTime) {
        oldestTime = v.timestamp;
        oldestKey = k;
      }
    }
    
    if (oldestKey) {
      queryCache.delete(oldestKey);
    }
  }
  
  // Cache result
  queryCache.set(key, {
    data,
    timestamp: Date.now()
  });
  
  // Clean up expired cache entries
  if (queryCache.size > MAX_CACHE_SIZE * 0.8) {
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