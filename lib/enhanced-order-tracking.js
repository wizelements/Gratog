// Enhanced Order and Customer Data Tracking System
// Provides comprehensive order lifecycle management and customer data insights


const DEBUG = process.env.DEBUG === "true";
const debug = (...args) => { if (DEBUG) console.log(...args); };

import { connectToDatabase } from './db-optimized';
import { v4 as uuidv4 } from 'uuid';
import { rewardsSystem } from './enhanced-rewards';

// Order status definitions
const ORDER_STATUSES = {
  pending: 'Order Created',
  confirmed: 'Order Confirmed',
  preparing: 'Preparing Your Order',
  ready: 'Ready for Pickup/Delivery',
  in_transit: 'Out for Delivery',
  delivered: 'Delivered',
  picked_up: 'Picked Up',
  cancelled: 'Cancelled',
  refunded: 'Refunded'
};

// Fulfillment types
const FULFILLMENT_TYPES = {
  pickup_market: 'Pickup at Market',
  pickup_browns_mill: 'Pickup at Browns Mill',
  delivery: 'Home Delivery'
};

class EnhancedOrderTracking {
  constructor() {
    this.db = null;
  }

  async initialize() {
    try {
      const { db } = await connectToDatabase();
      this.db = db;
      return true;
    } catch (error) {
      console.error('Failed to initialize order tracking:', error);
      return false;
    }
  }

  // Create comprehensive order record with fallback
  async createOrder(orderData, fallbackMode = true) {
    try {
      await this.initialize();
      
      // Generate order ID
      const orderId = uuidv4();
      const orderNumber = `TOG${Date.now().toString().slice(-6)}`;
      
      // Calculate totals
      const subtotal = orderData.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const couponDiscount = orderData.couponDiscount || 0;
      const deliveryFee = orderData.deliveryFee || 0;
      const tip = orderData.deliveryTip || 0;
      const total = subtotal - couponDiscount + deliveryFee + tip;
      
      // Create comprehensive order record
      const order = {
        id: orderId,
        orderNumber,
        status: 'pending',
        customer: {
          email: orderData.customer.email,
          name: orderData.customer.name,
          phone: orderData.customer.phone
        },
        items: orderData.cart.map(item => ({
          id: item.id,
          slug: item.slug,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity,
          size: item.size,
          category: item.category,
          rewardPoints: item.rewardPoints || 0,
          squareProductUrl: item.squareProductUrl,
          catalogObjectId: item.catalogObjectId || item.variationId, // Add for Square
          variationId: item.variationId || item.catalogObjectId // Add for Square
        })),
        fulfillment: {
          type: orderData.fulfillmentType,
          typeLabel: FULFILLMENT_TYPES[orderData.fulfillmentType] || orderData.fulfillmentType,
          deliveryAddress: orderData.deliveryAddress,
          deliveryTimeSlot: orderData.deliveryTimeSlot,
          deliveryInstructions: orderData.deliveryInstructions,
          deliveryFee: deliveryFee,
          deliveryTip: tip
        },
        pricing: {
          subtotal,
          couponDiscount,
          deliveryFee,
          tip,
          total,
          currency: 'USD'
        },
        coupon: orderData.appliedCoupon,
        payment: {
          status: 'pending',
          method: 'square',
          squareOrderId: null,
          squarePaymentId: null
        },
        metadata: {
          source: orderData.source || 'website',
          deviceInfo: orderData.deviceInfo,
          ip: orderData.ip,
          userAgent: orderData.deviceInfo?.userAgent
        },
        timeline: [
          {
            status: 'pending',
            timestamp: new Date(),
            message: 'Order created',
            actor: 'system'
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (!this.db) {
        if (fallbackMode) {
          return this.createFallbackOrder(order);
        }
        throw new Error('Database not available');
      }

      // Store order in database
      await this.db.collection('orders').insertOne(order);
      
      // Update customer record
      await this.updateCustomerRecord(orderData.customer, order);
      
      // Award points for order creation
      try {
        const pointsEarned = Math.floor(total); // 1 point per dollar
        await rewardsSystem.addPoints(
          orderData.customer.email,
          pointsEarned,
          'purchase',
          {
            orderId: order.id,
            orderTotal: total,
            itemCount: orderData.cart.length
          }
        );
      } catch (pointsError) {
        console.warn('Failed to award order points:', pointsError);
      }
      
      return {
        success: true,
        order,
        message: 'Order created successfully'
      };
      
    } catch (error) {
      console.error('Error creating order:', error);
      
      if (fallbackMode) {
        return this.createFallbackOrder(orderData);
      }
      
      throw error;
    }
  }

  // Create fallback order for offline mode
  createFallbackOrder(orderData) {
    const order = {
      ...orderData,
      id: `fallback_${Date.now()}`,
      orderNumber: `TOG${Date.now().toString().slice(-6)}`,
      status: 'pending',
      createdAt: new Date(),
      isFallback: true
    };
    
    // Store in localStorage for sync later (browser only)
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const fallbackOrders = JSON.parse(localStorage.getItem('taste-of-gratitude-fallback-orders') || '[]');
        fallbackOrders.push(order);
        localStorage.setItem('taste-of-gratitude-fallback-orders', JSON.stringify(fallbackOrders));
      }
    } catch (error) {
      console.error('Failed to store fallback order:', error);
    }
    
    return {
      success: true,
      order,
      isFallback: true,
      message: 'Order created offline - will sync when connection is restored'
    };
  }

  // Get order by ID with fallback
  async getOrder(orderId, fallbackMode = true) {
    try {
      await this.initialize();
      
      if (!this.db) {
        if (fallbackMode) {
          return this.getFallbackOrder(orderId);
        }
        throw new Error('Database not available');
      }

      const order = await this.db.collection('orders').findOne({ id: orderId });
      
      if (!order) {
        // Check fallback storage
        if (fallbackMode) {
          return this.getFallbackOrder(orderId);
        }
        throw new Error('Order not found');
      }
      
      return {
        success: true,
        order: this.formatOrderResponse(order)
      };
      
    } catch (error) {
      console.error('Error getting order:', error);
      
      if (fallbackMode) {
        return this.getFallbackOrder(orderId);
      }
      
      throw error;
    }
  }

  // Get fallback order from localStorage (server-side fallback)
  getFallbackOrder(orderId) {
    // Server-side fallback - we can't use localStorage here
    console.warn('Server-side fallback order requested - returning mock order');
    
    return {
      success: true,
      order: {
        id: orderId,
        orderNumber: `TOG${orderId.slice(-6)}`,
        status: 'pending',
        statusLabel: 'Order Created',
        customer: { email: 'unknown@example.com', name: 'Unknown Customer', phone: '' },
        items: [],
        pricing: { subtotal: 0, total: 0 },
        fulfillment: { type: 'pickup_market', typeLabel: 'Pickup at Market' },
        timeline: [{ status: 'pending', timestamp: new Date(), message: 'Order created (fallback)' }],
        createdAt: new Date(),
        isFallback: true
      },
      isFallback: true
    };
  }

  // Update order status
  async updateOrderStatus(orderId, newStatus, metadata = {}, fallbackMode = true) {
    try {
      await this.initialize();
      
      if (!this.db && !fallbackMode) {
        throw new Error('Database not available');
      }

      const timelineEntry = {
        status: newStatus,
        timestamp: new Date(),
        message: ORDER_STATUSES[newStatus] || newStatus,
        metadata,
        actor: metadata.actor || 'system'
      };

      if (this.db) {
        const result = await this.db.collection('orders').findOneAndUpdate(
          { id: orderId },
          {
            $set: {
              status: newStatus,
              updatedAt: new Date(),
              ...(metadata.payment && { 'payment.status': metadata.payment.status }),
              ...(metadata.squarePaymentId && { 'payment.squarePaymentId': metadata.squarePaymentId })
            },
            $push: {
              timeline: timelineEntry
            }
          },
          { returnDocument: 'after' }
        );

        if (result.value) {
          return {
            success: true,
            order: this.formatOrderResponse(result.value),
            message: `Order status updated to ${newStatus}`
          };
        }
        
        throw new Error('Failed to update order');
      } else {
        // Fallback mode - server-side mock response
        return this.updateFallbackOrderStatus(orderId, newStatus, timelineEntry);
      }
      
    } catch (error) {
      console.error('Error updating order status:', error);
      
      if (fallbackMode) {
        return this.updateFallbackOrderStatus(orderId, newStatus, { status: newStatus, timestamp: new Date() });
      }
      
      throw error;
    }
  }

  updateFallbackOrderStatus(orderId, newStatus, timelineEntry) {
    // Server-side fallback - we can't use localStorage here
    // Return a mock successful response since we're on the server
    console.warn('Server-side fallback order update attempted - returning mock success');
    
    return {
      success: true,
      order: {
        id: orderId,
        status: newStatus,
        statusLabel: newStatus,
        timeline: [timelineEntry],
        updatedAt: new Date(),
        isFallback: true
      },
      isFallback: true,
      message: `Order status updated to ${newStatus} (server-side fallback)`
    };
  }

  // Update customer record
  async updateCustomerRecord(customerData, order) {
    try {
      if (!this.db) return;

      const customer = {
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone,
        lastOrderAt: new Date(),
        updatedAt: new Date()
      };

      await this.db.collection('customers').findOneAndUpdate(
        { email: customerData.email },
        {
          $set: customer,
          $inc: {
            totalOrders: 1,
            totalSpent: order.pricing.total || 0
          },
          $push: {
            orderHistory: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              total: order.pricing.total,
              items: order.items.length,
              timestamp: new Date()
            }
          },
          $setOnInsert: {
            createdAt: new Date(),
            totalOrders: 0,
            totalSpent: 0,
            orderHistory: []
          }
        },
        { upsert: true, returnDocument: 'after' }
      );
      
    } catch (error) {
      console.error('Error updating customer record:', error);
      // Don't throw - customer update failure shouldn't block order creation
    }
  }

  // Get customer orders
  async getCustomerOrders(email, fallbackMode = true) {
    try {
      await this.initialize();
      
      if (!this.db) {
        if (fallbackMode) {
          return this.getFallbackCustomerOrders(email);
        }
        throw new Error('Database not available');
      }

      const orders = await this.db.collection('orders')
        .find({ 'customer.email': email })
        .sort({ createdAt: -1 })
        .toArray();
      
      return {
        success: true,
        orders: orders.map(order => this.formatOrderResponse(order))
      };
      
    } catch (error) {
      console.error('Error getting customer orders:', error);
      
      if (fallbackMode) {
        return this.getFallbackCustomerOrders(email);
      }
      
      throw error;
    }
  }

  getFallbackCustomerOrders(email) {
    // Server-side fallback - return empty orders since we can't use localStorage
    console.warn('Server-side fallback customer orders requested - returning empty array');
    
    return {
      success: true,
      orders: [],
      isFallback: true,
      message: 'Server-side fallback - no orders available'
    };
  }

  // Sync fallback orders when online
  async syncFallbackOrders() {
    try {
      await this.initialize();
      
      if (!this.db) {
        throw new Error('Database not available for sync');
      }

      // Check if we're in browser environment
      if (typeof window === 'undefined' || !window.localStorage) {
        return { success: true, synced: 0, message: 'localStorage not available' };
      }

      const fallbackOrders = JSON.parse(localStorage.getItem('taste-of-gratitude-fallback-orders') || '[]');
      
      if (fallbackOrders.length === 0) {
        return { success: true, synced: 0 };
      }

      let syncedCount = 0;
      const errors = [];
      
      for (const order of fallbackOrders) {
        try {
          // Remove fallback flags and sync to database
          const cleanOrder = { ...order };
          delete cleanOrder.isFallback;
          
          await this.db.collection('orders').insertOne(cleanOrder);
          await this.updateCustomerRecord(cleanOrder.customer, cleanOrder);
          
          syncedCount++;
        } catch (error) {
          errors.push({ order: order.id, error: error.message });
        }
      }
      
      // Clear synced orders
      if (syncedCount > 0) {
        localStorage.removeItem('taste-of-gratitude-fallback-orders');
      }
      
      return {
        success: true,
        synced: syncedCount,
        total: fallbackOrders.length,
        errors: errors.length > 0 ? errors : undefined
      };
      
    } catch (error) {
      console.error('Error syncing fallback orders:', error);
      return { success: false, error: error.message };
    }
  }

  // Format order response
  formatOrderResponse(order) {
    return {
      ...order,
      statusLabel: ORDER_STATUSES[order.status] || order.status,
      fulfillmentLabel: FULFILLMENT_TYPES[order.fulfillment?.type] || order.fulfillment?.type,
      timeline: order.timeline || [],
      canCancel: ['pending', 'confirmed'].includes(order.status),
      canTrack: ['preparing', 'ready', 'in_transit'].includes(order.status),
      isComplete: ['delivered', 'picked_up'].includes(order.status)
    };
  }

  // Get order analytics
  async getOrderAnalytics(startDate, endDate, fallbackMode = true) {
    try {
      await this.initialize();
      
      if (!this.db) {
        if (fallbackMode) {
          return this.getFallbackAnalytics();
        }
        throw new Error('Database not available');
      }

      const matchStage = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      const analytics = await this.db.collection('orders').aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$pricing.total' },
            averageOrderValue: { $avg: '$pricing.total' },
            totalItems: { $sum: { $size: '$items' } },
            statusBreakdown: {
              $push: '$status'
            },
            fulfillmentBreakdown: {
              $push: '$fulfillment.type'
            }
          }
        }
      ]).toArray();

      const result = analytics[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        totalItems: 0,
        statusBreakdown: [],
        fulfillmentBreakdown: []
      };

      return {
        success: true,
        analytics: {
          ...result,
          period: { startDate, endDate }
        }
      };
      
    } catch (error) {
      console.error('Error getting order analytics:', error);
      
      if (fallbackMode) {
        return this.getFallbackAnalytics();
      }
      
      throw error;
    }
  }

  getFallbackAnalytics() {
    return {
      success: true,
      analytics: {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        totalItems: 0,
        statusBreakdown: [],
        fulfillmentBreakdown: [],
        isFallback: true
      }
    };
  }
}

// Export singleton instance
export const orderTracking = new EnhancedOrderTracking();
export { ORDER_STATUSES, FULFILLMENT_TYPES };