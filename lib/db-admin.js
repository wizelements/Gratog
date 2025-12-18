
import { logger } from '@/lib/logger';
import { connectToDatabase as coreConnectToDatabase } from './db-optimized';

const LOG_PREFIX = '[DB-ADMIN]';

// CONSOLIDATED: Now uses the centralized db-optimized.js connection
// This avoids creating multiple MongoDB clients with different pool settings

export async function connectToDatabase() {
  logger.debug('DB', `${LOG_PREFIX} 📡 connectToDatabase() called (delegating to db-optimized)`);
  return coreConnectToDatabase();
}

export async function getAdminUsers() {
  logger.debug('DB', `${LOG_PREFIX} 👥 getAdminUsers() called`);
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('admin_users');
    
    // Count documents to verify collection exists
    const count = await collection.countDocuments();
    logger.debug('DB', `${LOG_PREFIX} ✅ admin_users collection found, ${count} documents`);
    
    return collection;
  } catch (error) {
    logger.error('DB', `${LOG_PREFIX} ❌ Failed to get admin_users collection:`, error);
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
    logger.error('DB', 'Error fetching orders:', error);
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
      logger.warn('DB', `Order ${orderId} not found for status update`);
      return { success: false, error: 'Order not found' };
    }
    
    logger.debug('DB', `Order ${orderId} status updated to ${status}`);
    return { 
      success: true, 
      orderId,
      status,
      modifiedCount: result.modifiedCount
    };
  } catch (error) {
    logger.error('DB', 'Error updating order status:', error);
    return { success: false, error: 'Failed to update order status' };
  }
}

export async function getAnalytics() {
  const { db } = await connectToDatabase();
  return db.collection('analytics');
}
