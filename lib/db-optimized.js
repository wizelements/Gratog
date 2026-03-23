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

// Global connection cache (use globalThis so .js and .ts modules share one cache)
let cachedClient = globalThis.__gratogCachedClient || null;
let cachedDb = globalThis.__gratogCachedDb || null;

// ---------------------------------------------------------------------------
// DEV-ONLY: In-memory DB fallback when MongoDB is unavailable locally.
// Production and Vercel deployments always require a real database.
// ---------------------------------------------------------------------------
const IS_PRODUCTION = () => process.env.NODE_ENV === 'production';
const IS_VERCEL = () => Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

// Use globalThis to ensure a single shared store across .js/.ts module instances
// (webpack dev mode can create separate module caches for different file types)
if (!globalThis.__gratogDevMemoryStore) {
  globalThis.__gratogDevMemoryStore = new Map();
}
const _memoryStore = globalThis.__gratogDevMemoryStore; // collection name → Map<string, doc>

function _getMemCollection(name) {
  if (!_memoryStore.has(name)) {
    _memoryStore.set(name, new Map());
  }
  const store = _memoryStore.get(name);

  return {
    insertOne(doc) {
      const key = doc.id || doc._id || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      if (!doc.id) doc.id = key;
      store.set(key, { ...doc });
      return { acknowledged: true, insertedId: key };
    },
    findOne(filter, _opts) {
      for (const doc of store.values()) {
        if (_matchFilter(doc, filter)) return { ...doc };
      }
      return null;
    },
    find(filter = {}, opts = {}) {
      const results = [];
      for (const doc of store.values()) {
        if (_matchFilter(doc, filter)) results.push({ ...doc });
      }
      return {
        sort() { return this; },
        limit(n) { results.splice(n); return this; },
        skip(n) { results.splice(0, n); return this; },
        toArray() { return Promise.resolve(results); },
      };
    },
    updateOne(filter, update) {
      for (const [key, doc] of store.entries()) {
        if (_matchFilter(doc, filter)) {
          if (update.$set) Object.assign(doc, update.$set);
          if (update.$push) {
            for (const [f, v] of Object.entries(update.$push)) {
              if (!Array.isArray(doc[f])) doc[f] = [];
              doc[f].push(v);
            }
          }
          store.set(key, doc);
          return { matchedCount: 1, modifiedCount: 1 };
        }
      }
      return { matchedCount: 0, modifiedCount: 0 };
    },
    findOneAndUpdate(filter, update, opts) {
      const doc = this.findOne(filter);
      if (doc) this.updateOne(filter, update);
      return doc;
    },
    aggregate() {
      return { toArray() { return Promise.resolve([]); } };
    },
    deleteOne(filter) {
      for (const [key, doc] of store.entries()) {
        if (_matchFilter(doc, filter)) {
          store.delete(key);
          return { deletedCount: 1 };
        }
      }
      return { deletedCount: 0 };
    },
  };
}

function _matchFilter(doc, filter) {
  if (!filter || Object.keys(filter).length === 0) return true;
  for (const [key, expected] of Object.entries(filter)) {
    const val = _getNestedValue(doc, key);
    if (expected && typeof expected === 'object' && expected.$in) {
      if (!expected.$in.includes(val)) return false;
    } else if (val !== expected) {
      return false;
    }
  }
  return true;
}

function _getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

function _createMemoryDb() {
  return {
    collection(name) { return _getMemCollection(name); },
    command(cmd) { return Promise.resolve({ ok: 1 }); },
    admin() {
      return { ping() { return Promise.resolve({ ok: 1 }); } };
    },
  };
}

// Exported for order-creation fallback to share the same in-memory store
export { _memoryStore as devMemoryStore };

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
  // Return cached in-memory fallback immediately (dev-only, no real client)
  if (!cachedClient && cachedDb) {
    return { client: null, db: cachedDb };
  }

  // Return cached connection if available
  if (cachedClient && cachedDb) {
    try {
      // Verify connection is still alive with timeout
      // CRITICAL FIX: Ping can hang forever without timeout
      const pingPromise = cachedDb.admin().ping();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MongoDB ping timeout after 3000ms')), 3000)
      );
      
      await Promise.race([pingPromise, timeoutPromise]);
      return { client: cachedClient, db: cachedDb };
    } catch (pingError) {
      logger.warn('DB', 'Cached connection failed ping, reconnecting', { 
        error: pingError.message 
      });
      cachedClient = null;
      cachedDb = null;
      globalThis.__gratogCachedClient = null;
      globalThis.__gratogCachedDb = null;
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
    
    // Cache the connections (sync to globalThis for cross-module sharing)
    cachedClient = client;
    cachedDb = db;
    globalThis.__gratogCachedClient = client;
    globalThis.__gratogCachedDb = db;

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
    globalThis.__gratogCachedClient = null;
    globalThis.__gratogCachedDb = null;

    // DEV-ONLY: Fall back to in-memory DB so local probes can exercise
    // auth/token boundaries without a live MongoDB instance.
    // Production and Vercel always fail hard.
    if (!IS_PRODUCTION() && !IS_VERCEL()) {
      logger.warn('DB', 'Using in-memory DB fallback (development only)');
      const memDb = _createMemoryDb();
      cachedDb = memDb;
      globalThis.__gratogCachedDb = memDb;
      return { client: null, db: memDb };
    }
    
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
    writeConcern: { w: 1, j: true }
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

// Default export for legacy imports
const dbExport = { connectToDatabase };
export default dbExport;