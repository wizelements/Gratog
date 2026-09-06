import { getCampaignAnalyticsSummary } from './campaigns/repository';
import { getCustomerAnalyticsData, getDashboardAnalytics, getSalesAnalyticsData } from './admin/analytics-repository';
import { logger } from '@/lib/logger';

/**
 * Get dashboard overview statistics
 * @returns {Promise<Object>} Dashboard stats
 */
export async function getDashboardStats() {
  try {
    return await getDashboardAnalytics();
  } catch (error) {
    logger.error('AdminAnalytics', 'Dashboard stats error', error);
    throw new Error('Failed to fetch dashboard statistics');
  }
}

/**
 * Get customer analytics with segmentation insights
 * @returns {Promise<Object>} Customer analytics
 */
export async function getCustomerAnalytics() {
  try {
    return await getCustomerAnalyticsData();
  } catch (error) {
    logger.error('AdminAnalytics', 'Customer analytics error', error);
    throw new Error('Failed to fetch customer analytics');
  }
}

/**
 * Get sales analytics
 * @returns {Promise<Object>} Sales analytics
 */
export async function getSalesAnalytics() {
  try {
    return await getSalesAnalyticsData();
  } catch (error) {
    logger.error('AdminAnalytics', 'Sales analytics error', error);
    throw new Error('Failed to fetch sales analytics');
  }
}

/**
 * Get campaign analytics summary
 * @returns {Promise<Object>} Campaign analytics
 */
export async function getCampaignAnalytics() {
  try {
    const { statusRows, sentTotals, recent } = await getCampaignAnalyticsSummary(10);

    const statsByStatus = {
      draft: statusRows.find(c => c.status === 'draft')?.count || 0,
      scheduled: statusRows.find(c => c.status === 'scheduled')?.count || 0,
      sending: statusRows.find(c => c.status === 'sending')?.count || 0,
      sent: statusRows.find(c => c.status === 'sent')?.count || 0
    };

    return {
      total: Object.values(statsByStatus).reduce((a, b) => a + b, 0),
      byStatus: statsByStatus,
      overall: {
        recipients: sentTotals.totalRecipients,
        sent: sentTotals.sent,
        failed: sentTotals.failed,
        deliveryRate: sentTotals.totalRecipients > 0
          ? ((sentTotals.sent / sentTotals.totalRecipients) * 100).toFixed(1)
          : 0
      },
      recent: recent.map(c => ({
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
    logger.error('AdminAnalytics', 'Campaign analytics error', error);
    throw new Error('Failed to fetch campaign analytics');
  }
}
