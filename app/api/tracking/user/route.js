import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { randomUUID } from 'crypto';

/**
 * User Tracking API - Comprehensive tracking for orders, spins, and user activity
 * 
 * Tracks:
 * - All orders (pending, completed, failed)
 * - Spin wheel eligibility and history
 * - Coupon usage
 * - User purchase history
 * - Passport activity
 */

export async function POST(request) {
  try {
    const { action, userId, userEmail, data } = await request.json();
    
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'User email is required' },
        { status: 400 }
      );
    }
    
    const { db } = await connectToDatabase();
    
    switch (action) {
      case 'track_order':
        return await trackOrder(db, userEmail, data);
        
      case 'earn_spin':
        return await awardSpin(db, userEmail, data);
        
      case 'get_user_stats':
        return await getUserStats(db, userEmail);
        
      case 'use_spin':
        return await processUserSpin(db, userEmail, data);
        
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('User tracking error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to track user activity' },
      { status: 500 }
    );
  }
}

// Track order and award spins based on purchase
async function trackOrder(db, userEmail, orderData) {
  try {
    const orderId = orderData.orderId || `ORDER-${Date.now()}`;
    const total = parseFloat(orderData.total) || 0;
    const status = orderData.status || 'pending';
    
    // Get or create user profile
    let userProfile = await db.collection('user_profiles').findOne({ email: userEmail });
    
    if (!userProfile) {
      userProfile = {
        id: randomUUID(),
        email: userEmail,
        name: orderData.customerName || '',
        phone: orderData.customerPhone || '',
        createdAt: new Date(),
        totalOrders: 0,
        totalSpent: 0,
        availableSpins: 0,
        spinsEarned: 0,
        spinsUsed: 0,
        orders: [],
        spinHistory: []
      };
      
      await db.collection('user_profiles').insertOne(userProfile);
    }
    
    // Track the order
    const orderRecord = {
      id: orderId,
      userId: userProfile.id,
      userEmail,
      total,
      status,
      items: orderData.items || [],
      fulfillmentType: orderData.fulfillmentType,
      deliveryAddress: orderData.deliveryAddress,
      couponCode: orderData.couponCode,
      couponDiscount: orderData.couponDiscount || 0,
      paymentMethod: orderData.paymentMethod || 'square_online',
      squareTransactionId: orderData.transactionId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('orders').insertOne(orderRecord);
    
    // If order is completed, award spins and update stats
    if (status === 'completed' || status === 'paid') {
      const isFirstOrder = userProfile.totalOrders === 0;
      let spinsEarned = 0;
      
      // Award spins based on purchase amount
      if (isFirstOrder && total >= 15) {
        spinsEarned = 1; // First order $15+
      } else if (!isFirstOrder && total >= 20) {
        spinsEarned = Math.floor(total / 20); // 1 spin per $20 (can stack!)
      }
      
      // Update user profile
      await db.collection('user_profiles').updateOne(
        { email: userEmail },
        {
          $inc: {
            totalOrders: 1,
            totalSpent: total,
            availableSpins: spinsEarned,
            spinsEarned: spinsEarned
          },
          $push: {
            orders: {
              orderId,
              total,
              status,
              date: new Date(),
              spinsAwarded: spinsEarned
            }
          },
          $set: {
            lastOrderDate: new Date(),
            updatedAt: new Date()
          }
        }
      );
      
      return NextResponse.json({
        success: true,
        orderId,
        spinsEarned,
        totalAvailableSpins: userProfile.availableSpins + spinsEarned,
        message: spinsEarned > 0 
          ? `Order tracked! You earned ${spinsEarned} spin${spinsEarned > 1 ? 's' : ''}!` 
          : 'Order tracked successfully'
      });
    }
    
    return NextResponse.json({
      success: true,
      orderId,
      message: 'Order tracked (pending payment)'
    });
    
  } catch (error) {
    console.error('Track order error:', error);
    throw error;
  }
}

// Award spin to user (called after purchase confirmation)
async function awardSpin(db, userEmail, data) {
  try {
    const spinsToAward = parseInt(data.spins) || 1;
    const reason = data.reason || 'purchase';
    const orderId = data.orderId;
    
    const result = await db.collection('user_profiles').findOneAndUpdate(
      { email: userEmail },
      {
        $inc: {
          availableSpins: spinsToAward,
          spinsEarned: spinsToAward
        },
        $push: {
          spinHistory: {
            id: randomUUID(),
            action: 'earned',
            spins: spinsToAward,
            reason,
            orderId,
            timestamp: new Date()
          }
        },
        $set: { updatedAt: new Date() }
      },
      { 
        returnDocument: 'after',
        upsert: true
      }
    );
    
    return NextResponse.json({
      success: true,
      spinsAwarded: spinsToAward,
      totalAvailableSpins: result.value?.availableSpins || spinsToAward,
      message: `You earned ${spinsToAward} spin${spinsToAward > 1 ? 's' : ''}!`
    });
    
  } catch (error) {
    console.error('Award spin error:', error);
    throw error;
  }
}

// Use a spin (deduct from available count)
async function processUserSpin(db, userEmail, data) {
  try {
    const prizeWon = data.prize;
    const couponCode = data.couponCode;
    
    // Check if user has spins available
    const userProfile = await db.collection('user_profiles').findOne({ email: userEmail });
    
    if (!userProfile || userProfile.availableSpins <= 0) {
      return NextResponse.json(
        { success: false, error: 'No spins available' },
        { status: 400 }
      );
    }
    
    // Deduct spin and record usage
    await db.collection('user_profiles').updateOne(
      { email: userEmail },
      {
        $inc: {
          availableSpins: -1,
          spinsUsed: 1
        },
        $push: {
          spinHistory: {
            id: randomUUID(),
            action: 'used',
            prize: prizeWon,
            couponCode: couponCode,
            timestamp: new Date()
          }
        },
        $set: { updatedAt: new Date() }
      }
    );
    
    return NextResponse.json({
      success: true,
      remainingSpins: userProfile.availableSpins - 1,
      prizeWon,
      couponCode,
      message: `Spin used! You have ${userProfile.availableSpins - 1} spins remaining`
    });
    
  } catch (error) {
    console.error('Use spin error:', error);
    throw error;
  }
}

// Get comprehensive user statistics
async function getUserStats(db, userEmail) {
  try {
    const userProfile = await db.collection('user_profiles').findOne({ email: userEmail });
    
    if (!userProfile) {
      return NextResponse.json({
        success: true,
        stats: {
          totalOrders: 0,
          totalSpent: 0,
          availableSpins: 0,
          spinsEarned: 0,
          spinsUsed: 0,
          orders: [],
          spinHistory: [],
          isNewUser: true
        }
      });
    }
    
    // Get passport info
    const passport = await db.collection('passports').findOne({ customerEmail: userEmail });
    
    // Get unused coupons
    const coupons = await db.collection('coupons').find({
      email: userEmail,
      used: false,
      expiresAt: { $gt: new Date() }
    }).toArray();
    
    return NextResponse.json({
      success: true,
      stats: {
        totalOrders: userProfile.totalOrders || 0,
        totalSpent: userProfile.totalSpent || 0,
        availableSpins: userProfile.availableSpins || 0,
        spinsEarned: userProfile.spinsEarned || 0,
        spinsUsed: userProfile.spinsUsed || 0,
        orders: userProfile.orders || [],
        spinHistory: userProfile.spinHistory || [],
        passport: passport ? {
          level: passport.level,
          totalStamps: passport.totalStamps,
          xpPoints: passport.xpPoints,
          vouchers: passport.vouchers?.filter(v => !v.used) || []
        } : null,
        availableCoupons: coupons.length,
        coupons: coupons.map(c => ({
          code: c.code,
          discount: c.discount,
          expiresAt: c.expiresAt,
          type: c.type
        })),
        isNewUser: false
      }
    });
    
  } catch (error) {
    console.error('Get user stats error:', error);
    throw error;
  }
}

// GET endpoint for retrieving user stats
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email parameter required' },
        { status: 400 }
      );
    }
    
    const { db } = await connectToDatabase();
    return await getUserStats(db, email);
    
  } catch (error) {
    console.error('Get user stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get user stats' },
      { status: 500 }
    );
  }
}
