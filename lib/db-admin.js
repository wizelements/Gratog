
const DEBUG = process.env.DEBUG === "true";
const debug = (...args) => { if (DEBUG) console.log(...args); };

import { MongoClient } from 'mongodb';

const LOG_PREFIX = '[DB-ADMIN]';

function getMongoUrl() {
  debug(`${LOG_PREFIX} 🔍 Checking MongoDB connection configuration`);
  
  const url = process.env.MONGODB_URI || process.env.MONGO_URL;
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
  
  debug(`${LOG_PREFIX} Environment:`, {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    isProduction,
    hasMONGODB_URI: !!process.env.MONGODB_URI,
    hasMONGO_URL: !!process.env.MONGO_URL
  });
  
  if (!url) {
    if (isProduction) {
      console.error(`${LOG_PREFIX} ❌ CRITICAL: No MongoDB URI configured in production`);
      console.error(`${LOG_PREFIX} Required: MONGODB_URI or MONGO_URL environment variable`);
      console.error(`${LOG_PREFIX} Fix: Add to Vercel → Settings → Environment Variables`);
      throw new Error(
        'MONGODB_URI environment variable is required in production. ' +
        'Please configure it in your Vercel dashboard: Settings > Environment Variables'
      );
    }
    // Development fallback
    console.warn(`${LOG_PREFIX} ⚠️  Using local MongoDB - set MONGODB_URI for production`);
    return 'mongodb://localhost:27017';
  }
  
  debug(`${LOG_PREFIX} ✅ MongoDB URI found:`, url.substring(0, 20) + '...');
  return url;
}

const DB_NAME = process.env.DB_NAME || process.env.DATABASE_NAME || 'taste_of_gratitude';

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  debug(`${LOG_PREFIX} 📡 connectToDatabase() called`);
  
  if (cachedClient && cachedDb) {
    debug(`${LOG_PREFIX} ✅ Using cached MongoDB connection`);
    return { client: cachedClient, db: cachedDb };
  }

  try {
    debug(`${LOG_PREFIX} 🔄 Establishing new MongoDB connection`);
    const mongoUrl = getMongoUrl();
    
    debug(`${LOG_PREFIX} 🔌 Connecting to MongoDB...`);
    const client = await MongoClient.connect(mongoUrl);
    debug(`${LOG_PREFIX} ✅ MongoDB client connected`);
    
    const db = client.db(DB_NAME);
    debug(`${LOG_PREFIX} ✅ Database selected:`, DB_NAME);

    cachedClient = client;
    cachedDb = db;

    debug(`${LOG_PREFIX} ✅ Connection cached for reuse`);
    return { client, db };
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ MongoDB connection failed:`, error.message);
    console.error(`${LOG_PREFIX} Error type:`, error.constructor.name);
    console.error(`${LOG_PREFIX} Error code:`, error.code);
    console.error(`${LOG_PREFIX} Stack trace:`, error.stack);
    throw error;
  }
}

export async function getAdminUsers() {
  debug(`${LOG_PREFIX} 👥 getAdminUsers() called`);
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('admin_users');
    
    // Count documents to verify collection exists
    const count = await collection.countDocuments();
    debug(`${LOG_PREFIX} ✅ admin_users collection found, ${count} documents`);
    
    return collection;
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Failed to get admin_users collection:`, error.message);
    throw error;
  }
}

export async function getInventory() {
  const { db } = await connectToDatabase();
  return db.collection('inventory');
}

export async function getOrders() {
  try {
    const { db } = await connectToDatabase();
    const orders = await db.collection('orders').find({}).sort({ createdAt: -1 }).toArray();
    
    return {
      success: true,
      orders: orders.map(order => ({
        ...order,
        id: order._id?.toString() || order.id
      }))
    };
  } catch (error) {
    console.error('Error fetching orders:', error);
    return { success: false, error: 'Failed to fetch orders' };
  }
}

export async function updateOrderStatus(orderId, status, additionalData = {}) {
  try {
    const { db } = await connectToDatabase();
    
    const updateData = {
      status,
      statusUpdatedAt: new Date().toISOString(),
      ...additionalData
    };
    
    const result = await db.collection('orders').updateOne(
      { id: orderId },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      console.warn(`Order ${orderId} not found for status update`);
      return { success: false, error: 'Order not found' };
    }
    
    debug(`Order ${orderId} status updated to ${status}`);
    return { 
      success: true, 
      orderId,
      status,
      modifiedCount: result.modifiedCount
    };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error: 'Failed to update order status' };
  }
}

export async function getAnalytics() {
  const { db } = await connectToDatabase();
  return db.collection('analytics');
}
