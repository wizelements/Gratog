import { MongoClient } from 'mongodb';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'taste_of_gratitude';

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = await MongoClient.connect(MONGO_URL);
  const db = client.db(DB_NAME);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export async function getAdminUsers() {
  const { db } = await connectToDatabase();
  return db.collection('admin_users');
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
    
    console.log(`Order ${orderId} status updated to ${status}`);
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
