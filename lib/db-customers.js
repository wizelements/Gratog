const DEBUG = process.env.DEBUG === "true" || process.env.VERBOSE === "true";
const debug = (...args) => { if (DEBUG) console.log('[DB-CUSTOMERS]', ...args); };

import { connectToDatabase } from './db-admin';
import { logger } from '@/lib/logger';

export async function getCustomers() {
  const { db } = await connectToDatabase();
  return db.collection('customers');
}

export async function getWaitlist() {
  const { db } = await connectToDatabase();
  return db.collection('waitlist');
}

export async function getCommunications() {
  const { db } = await connectToDatabase();
  return db.collection('communications');
}

export async function createOrUpdateCustomer(customerData) {
  const customers = await getCustomers();
  
  // Check if customer exists by email or phone
  const existing = await customers.findOne({
    $or: [
      { email: customerData.email },
      { phone: customerData.phone }
    ]
  });
  
  if (existing) {
    // Update existing customer
    await customers.updateOne(
      { _id: existing._id },
      {
        $set: {
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          updatedAt: new Date()
        }
      }
    );
    return existing._id;
  }
  
  // Create new customer
  const newCustomer = {
    _id: customerData._id || require('uuid').v4(),
    name: customerData.name,
    email: customerData.email.toLowerCase(),
    phone: customerData.phone,
    address: customerData.address || {},
    preferences: {
      fulfillmentType: 'pickup',
      deliveryInstructions: '',
      favoriteProducts: []
    },
    stats: {
      totalOrders: 0,
      totalSpent: 0,
      averageOrder: 0,
      lastOrderDate: null,
      firstOrderDate: new Date(),
      lifetimeValue: 0
    },
    segment: 'new',
    marketingConsent: {
      sms: true,
      email: true
    },
    notes: '',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const result = await customers.insertOne(newCustomer);
  return newCustomer._id;
}

export async function updateCustomerStats(customerId, orderAmount) {
  const customers = await getCustomers();
  const customer = await customers.findOne({ _id: customerId });
  
  if (!customer) return;
  
  const totalOrders = (customer.stats?.totalOrders || 0) + 1;
  const totalSpent = (customer.stats?.totalSpent || 0) + orderAmount;
  const averageOrder = Math.round(totalSpent / totalOrders);
  
  // Determine segment
  let segment = 'new';
  if (totalOrders >= 10 || totalSpent >= 50000) segment = 'vip';
  else if (totalOrders >= 3) segment = 'regular';
  
  await customers.updateOne(
    { _id: customerId },
    {
      $set: {
        'stats.totalOrders': totalOrders,
        'stats.totalSpent': totalSpent,
        'stats.averageOrder': averageOrder,
        'stats.lastOrderDate': new Date(),
        'stats.lifetimeValue': totalSpent,
        segment,
        updatedAt: new Date()
      }
    }
  );
}

export async function createOrder(orderDetails) {
  const { db } = await connectToDatabase();
  const orders = db.collection('orders');
  
  // Create or update customer first
  const customerId = await createOrUpdateCustomer(orderDetails.customer);
  
  // Create order record
  const order = {
    _id: orderDetails.id,
    customerId,
    customer: orderDetails.customer,
    items: orderDetails.items,
    total: orderDetails.total,
    fulfillmentType: orderDetails.fulfillmentType,
    status: orderDetails.status,
    paymentId: orderDetails.paymentId,
    paymentMethod: orderDetails.paymentMethod,
    createdAt: orderDetails.createdAt,
    updatedAt: new Date(),
    // Include delivery details if applicable
    ...(orderDetails.deliveryAddress && {
      deliveryAddress: orderDetails.deliveryAddress,
      deliveryTimeSlot: orderDetails.deliveryTimeSlot,
      deliveryInstructions: orderDetails.deliveryInstructions
    })
  };
  
  await orders.insertOne(order);
  
  // Update customer stats
  await updateCustomerStats(customerId, orderDetails.total);
  
  return order;
}

/**
 * Status precedence order - prevents webhooks from regressing status
 * Higher index = more final state (can't be overwritten by lower index)
 */
const STATUS_PRECEDENCE = [
  'pending',
  'payment_pending',
  'payment_processing',
  'paid',
  'preparing',
  'ready_for_pickup',
  'shipped',
  'delivered',
  'completed',
  'refunded',
  'cancelled',
  'payment_failed'
];

function getStatusPrecedence(status) {
  const index = STATUS_PRECEDENCE.indexOf(status?.toLowerCase?.() || status);
  return index === -1 ? 0 : index;
}

export async function updateOrderStatus(orderId, status, additionalData = {}) {
  try {
    const { db } = await connectToDatabase();
    
    // MONOTONIC STATUS: Fetch current order to check status precedence
    const currentOrder = await db.collection('orders').findOne({ id: orderId });
    
    if (!currentOrder) {
      // Try finding by Square order ID
      const bySquareId = await db.collection('orders').findOne({ 
        'metadata.squareOrderId': orderId 
      });
      
      if (!bySquareId) {
        console.warn(`Order ${orderId} not found for status update`);
        return { success: false, error: 'Order not found' };
      }
      // Found by Square ID, use that order
      orderId = bySquareId.id;
    }
    
    const currentStatus = currentOrder?.status || 'pending';
    const currentPrecedence = getStatusPrecedence(currentStatus);
    const newPrecedence = getStatusPrecedence(status);
    
    // GUARD: Don't allow status regression (except for payment_failed which can happen anytime)
    // Allow: pending -> paid, paid -> refunded
    // Block: paid -> payment_processing, completed -> pending
    if (newPrecedence < currentPrecedence && status !== 'payment_failed' && status !== 'cancelled') {
      debug(`Blocking status regression: ${currentStatus} -> ${status} for order ${orderId}`);
      return { 
        success: true, 
        orderId,
        status: currentStatus,
        blocked: true,
        reason: `Cannot regress from '${currentStatus}' to '${status}'`
      };
    }
    
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
    
    debug(`Order ${orderId} status updated to ${status} (was: ${currentStatus})`);
    return { 
      success: true, 
      orderId,
      status,
      previousStatus: currentStatus,
      modifiedCount: result.modifiedCount
    };
  } catch (error) {
    logger.error('Customers', 'Error updating order status', error);
    return { success: false, error: 'Failed to update order status' };
  }
}
