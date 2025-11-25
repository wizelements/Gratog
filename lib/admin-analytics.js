import clientPromise from './db-optimized';

const DB_NAME = process.env.DB_NAME || 'taste_of_gratitude';

/**
 * Get dashboard overview statistics
 * @returns {Promise<Object>} Dashboard stats
 */
export async function getDashboardStats() {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  try {
    // Get counts
    const [
      totalCustomers,
      totalOrders,
      totalCampaigns,
      activeChallenges
    ] = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('orders').countDocuments(),
      db.collection('campaigns').countDocuments(),
      db.collection('challenges').countDocuments({ streakDays: { $gte: 3 } })
    ]);

    // Get revenue (last 30 days and total)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const revenueData = await db.collection('orders').aggregate([
      {
        $match: {
          status: { $in: ['completed', 'fulfilled', 'paid'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: {
                if: { $eq: [{ $type: '$total' }, 'string'] },
                then: { $toDouble: '$total' },
                else: '$total'
              }
            }
          },
          last30DaysRevenue: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', thirtyDaysAgo] },
                {
                  $cond: {
                    if: { $eq: [{ $type: '$total' }, 'string'] },
                    then: { $toDouble: '$total' },
                    else: '$total'
                  }
                },
                0
              ]
            }
          }
        }
      }
    ]).toArray();

    const revenue = revenueData[0] || { totalRevenue: 0, last30DaysRevenue: 0 };

    // Get recent activity
    const recentOrders = await db.collection('orders')
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    const recentCustomers = await db.collection('users')
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    return {
      customers: {
        total: totalCustomers,
        active: activeChallenges,
        recentSignups: recentCustomers.length
      },
      orders: {
        total: totalOrders,
        last30Days: recentOrders.filter(o => 
          new Date(o.createdAt) >= thirtyDaysAgo
        ).length
      },
      revenue: {
        total: revenue.totalRevenue || 0,
        last30Days: revenue.last30DaysRevenue || 0,
        averageOrderValue: totalOrders > 0 
          ? (revenue.totalRevenue / totalOrders).toFixed(2)
          : 0
      },
      campaigns: {
        total: totalCampaigns,
        active: await db.collection('campaigns').countDocuments({ status: 'sending' }),
        sent: await db.collection('campaigns').countDocuments({ status: 'sent' })
      },
      recentActivity: {
        orders: recentOrders,
        customers: recentCustomers.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email,
          createdAt: c.createdAt
        }))
      }
    };
  } catch (error) {
    console.error('Dashboard stats error:', error);
    throw new Error('Failed to fetch dashboard statistics');
  }
}

/**
 * Get customer analytics with segmentation insights
 * @returns {Promise<Object>} Customer analytics
 */
export async function getCustomerAnalytics() {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  try {
    // Total customers
    const totalCustomers = await db.collection('users').countDocuments();

    // Customer growth (last 6 months)
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const growthData = await db.collection('users').aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]).toArray();

    // Purchase frequency distribution
    const ordersCollection = db.collection('orders');
    const userOrderCounts = await ordersCollection.aggregate([
      {
        $group: {
          _id: '$userId',
          orderCount: { $sum: 1 }
        }
      }
    ]).toArray();

    const firstTime = userOrderCounts.filter(u => u.orderCount === 1).length;
    const repeat = userOrderCounts.filter(u => u.orderCount >= 2 && u.orderCount < 5).length;
    const loyal = userOrderCounts.filter(u => u.orderCount >= 5).length;

    // Customer lifetime value segments
    const clvData = await ordersCollection.aggregate([
      {
        $match: {
          status: { $in: ['completed', 'fulfilled', 'paid'] }
        }
      },
      {
        $group: {
          _id: '$userId',
          totalSpent: {
            $sum: {
              $cond: {
                if: { $eq: [{ $type: '$total' }, 'string'] },
                then: { $toDouble: '$total' },
                else: '$total'
              }
            }
          }
        }
      }
    ]).toArray();

    const highValue = clvData.filter(u => u.totalSpent >= 200).length;
    const mediumValue = clvData.filter(u => u.totalSpent >= 50 && u.totalSpent < 200).length;
    const lowValue = clvData.filter(u => u.totalSpent < 50).length;

    // Rewards tiers distribution
    const rewardsData = await db.collection('rewards').aggregate([
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $gte: ['$points', 1000] }, then: 'gold' },
                { case: { $gte: ['$points', 500] }, then: 'silver' }
              ],
              default: 'bronze'
            }
          },
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const rewardsTiers = {
      bronze: rewardsData.find(r => r._id === 'bronze')?.count || 0,
      silver: rewardsData.find(r => r._id === 'silver')?.count || 0,
      gold: rewardsData.find(r => r._id === 'gold')?.count || 0
    };

    // Challenge participation
    const activeChallengers = await db.collection('challenges').countDocuments({ streakDays: { $gte: 3 } });
    const inactiveChallengers = await db.collection('challenges').countDocuments({ streakDays: { $lt: 3 } });

    // Email preferences
    const emailStats = await db.collection('users').aggregate([
      {
        $group: {
          _id: null,
          marketingOptIn: {
            $sum: {
              $cond: [
                { $eq: ['$emailPreferences.marketing', true] },
                1,
                0
              ]
            }
          },
          marketingOptOut: {
            $sum: {
              $cond: [
                { $eq: ['$emailPreferences.marketing', false] },
                1,
                0
              ]
            }
          }
        }
      }
    ]).toArray();

    const emailPreferences = emailStats[0] || { marketingOptIn: 0, marketingOptOut: 0 };

    return {
      total: totalCustomers,
      growth: growthData.map(g => ({
        month: `${g._id.year}-${String(g._id.month).padStart(2, '0')}`,
        count: g.count
      })),
      segments: {
        byFrequency: {
          firstTime,
          repeat,
          loyal
        },
        byValue: {
          high: highValue,
          medium: mediumValue,
          low: lowValue
        },
        byRewards: rewardsTiers,
        byChallenge: {
          active: activeChallengers,
          inactive: inactiveChallengers
        }
      },
      emailPreferences: {
        optedIn: emailPreferences.marketingOptIn,
        optedOut: emailPreferences.marketingOptOut,
        optInRate: totalCustomers > 0
          ? ((emailPreferences.marketingOptIn / totalCustomers) * 100).toFixed(1)
          : 0
      }
    };
  } catch (error) {
    console.error('Customer analytics error:', error);
    throw new Error('Failed to fetch customer analytics');
  }
}

/**
 * Get sales analytics
 * @returns {Promise<Object>} Sales analytics
 */
export async function getSalesAnalytics() {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  try {
    const ordersCollection = db.collection('orders');

    // Total orders and revenue
    const totalStats = await ordersCollection.aggregate([
      {
        $match: {
          status: { $in: ['completed', 'fulfilled', 'paid'] }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: {
                if: { $eq: [{ $type: '$total' }, 'string'] },
                then: { $toDouble: '$total' },
                else: '$total'
              }
            }
          }
        }
      }
    ]).toArray();

    const stats = totalStats[0] || { totalOrders: 0, totalRevenue: 0 };

    // Sales over time (last 12 months)
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const salesOverTime = await ordersCollection.aggregate([
      {
        $match: {
          status: { $in: ['completed', 'fulfilled', 'paid'] },
          createdAt: { $gte: oneYearAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          orders: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: {
                if: { $eq: [{ $type: '$total' }, 'string'] },
                then: { $toDouble: '$total' },
                else: '$total'
              }
            }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]).toArray();

    // Top products
    const topProducts = await ordersCollection.aggregate([
      {
        $match: {
          status: { $in: ['completed', 'fulfilled', 'paid'] }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          quantity: { $sum: '$items.quantity' },
          revenue: {
            $sum: {
              $multiply: [
                '$items.quantity',
                {
                  $cond: {
                    if: { $eq: [{ $type: '$items.price' }, 'string'] },
                    then: { $toDouble: '$items.price' },
                    else: '$items.price'
                  }
                }
              ]
            }
          }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 10 }
    ]).toArray();

    // Category breakdown
    const categoryBreakdown = await ordersCollection.aggregate([
      {
        $match: {
          status: { $in: ['completed', 'fulfilled', 'paid'] }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.category',
          orders: { $sum: 1 },
          quantity: { $sum: '$items.quantity' },
          revenue: {
            $sum: {
              $multiply: [
                '$items.quantity',
                {
                  $cond: {
                    if: { $eq: [{ $type: '$items.price' }, 'string'] },
                    then: { $toDouble: '$items.price' },
                    else: '$items.price'
                  }
                }
              ]
            }
          }
        }
      },
      { $sort: { revenue: -1 } }
    ]).toArray();

    // Fulfillment type breakdown
    const fulfillmentStats = await ordersCollection.aggregate([
      {
        $match: {
          status: { $in: ['completed', 'fulfilled', 'paid'] }
        }
      },
      {
        $group: {
          _id: '$fulfillmentType',
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: {
                if: { $eq: [{ $type: '$total' }, 'string'] },
                then: { $toDouble: '$total' },
                else: '$total'
              }
            }
          }
        }
      }
    ]).toArray();

    return {
      total: {
        orders: stats.totalOrders,
        revenue: stats.totalRevenue,
        averageOrderValue: stats.totalOrders > 0
          ? (stats.totalRevenue / stats.totalOrders).toFixed(2)
          : 0
      },
      salesOverTime: salesOverTime.map(s => ({
        month: `${s._id.year}-${String(s._id.month).padStart(2, '0')}`,
        orders: s.orders,
        revenue: s.revenue
      })),
      topProducts: topProducts.map(p => ({
        name: p._id || 'Unknown',
        quantity: p.quantity,
        revenue: p.revenue
      })),
      categoryBreakdown: categoryBreakdown.map(c => ({
        category: c._id || 'Uncategorized',
        orders: c.orders,
        quantity: c.quantity,
        revenue: c.revenue
      })),
      fulfillmentTypes: fulfillmentStats.map(f => ({
        type: f._id || 'unknown',
        orders: f.count,
        revenue: f.revenue
      }))
    };
  } catch (error) {
    console.error('Sales analytics error:', error);
    throw new Error('Failed to fetch sales analytics');
  }
}

/**
 * Get campaign analytics summary
 * @returns {Promise<Object>} Campaign analytics
 */
export async function getCampaignAnalytics() {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  try {
    // Total campaigns by status
    const campaignStats = await db.collection('campaigns').aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const statsByStatus = {
      draft: campaignStats.find(c => c._id === 'draft')?.count || 0,
      scheduled: campaignStats.find(c => c._id === 'scheduled')?.count || 0,
      sending: campaignStats.find(c => c._id === 'sending')?.count || 0,
      sent: campaignStats.find(c => c._id === 'sent')?.count || 0
    };

    // Overall email stats
    const emailStats = await db.collection('campaigns').aggregate([
      {
        $match: {
          status: 'sent'
        }
      },
      {
        $group: {
          _id: null,
          totalRecipients: { $sum: '$stats.totalRecipients' },
          totalSent: { $sum: '$stats.sent' },
          totalFailed: { $sum: '$stats.failed' }
        }
      }
    ]).toArray();

    const overall = emailStats[0] || { totalRecipients: 0, totalSent: 0, totalFailed: 0 };

    // Recent campaigns
    const recentCampaigns = await db.collection('campaigns')
      .find()
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    return {
      total: Object.values(statsByStatus).reduce((a, b) => a + b, 0),
      byStatus: statsByStatus,
      overall: {
        recipients: overall.totalRecipients,
        sent: overall.totalSent,
        failed: overall.totalFailed,
        deliveryRate: overall.totalRecipients > 0
          ? ((overall.totalSent / overall.totalRecipients) * 100).toFixed(1)
          : 0
      },
      recent: recentCampaigns.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        recipients: c.stats.totalRecipients,
        sent: c.stats.sent,
        createdAt: c.createdAt,
        sentAt: c.sentAt
      }))
    };
  } catch (error) {
    console.error('Campaign analytics error:', error);
    throw new Error('Failed to fetch campaign analytics');
  }
}
