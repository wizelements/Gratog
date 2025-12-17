const DEBUG = process.env.DEBUG === "true" || process.env.VERBOSE === "true";
const debug = (...args) => { if (DEBUG) debug(...args); };

import clientPromise from './db-optimized';
import { sendEmail } from './email/service';
import { generateUnsubscribeToken } from './email/service';

const DB_NAME = process.env.DB_NAME || 'taste_of_gratitude';

/**
 * Create a new campaign with validation
 * @param {Object} campaignData - Campaign data
 * @returns {Promise<Object>} Created campaign
 */
export async function createCampaign({
  name,
  subject,
  preheader,
  body,
  segmentCriteria = {},
  scheduledFor = null,
  createdBy
}) {
  // Input validation
  if (!name || name.trim().length === 0) {
    throw new Error('Campaign name is required');
  }
  if (!subject || subject.trim().length === 0) {
    throw new Error('Subject line is required');
  }
  if (!body || body.trim().length === 0) {
    throw new Error('Email body is required');
  }
  if (!createdBy) {
    throw new Error('Creator ID is required');
  }

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const campaign = {
    id: `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: name.trim(),
    subject: subject.trim(),
    preheader: preheader?.trim() || '',
    body: body.trim(),
    segmentCriteria: segmentCriteria || {},
    status: scheduledFor ? 'scheduled' : 'draft',
    scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
    sentAt: null,
    createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
    stats: {
      totalRecipients: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      failed: 0
    }
  };

  await db.collection('campaigns').insertOne(campaign);
  debug(`✅ Campaign created: ${campaign.id} by ${createdBy}`);
  return campaign;
}

/**
 * Get customers matching segment criteria with robust filtering
 * @param {Object} segmentCriteria - Segmentation criteria
 * @returns {Promise<Array>} Matching customers
 */
export async function getSegmentCustomers(segmentCriteria = {}) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  let matchingUserIds = null; // null means "all users"
  const {
    purchaseFrequency,
    purchaseAmount,
    productPreferences,
    rewardsTier,
    challengeParticipation,
    location,
    inactive,
    customTags
  } = segmentCriteria;

  // 1. Purchase frequency filter
  if (purchaseFrequency) {
    const ordersCollection = db.collection('orders');
    const userOrders = await ordersCollection.aggregate([
      {
        $group: {
          _id: '$userId',
          orderCount: { $sum: 1 }
        }
      }
    ]).toArray();

    let filteredIds = [];
    if (purchaseFrequency === 'first-time') {
      filteredIds = userOrders.filter(u => u.orderCount === 1).map(u => u._id);
    } else if (purchaseFrequency === 'repeat') {
      filteredIds = userOrders.filter(u => u.orderCount >= 2 && u.orderCount < 5).map(u => u._id);
    } else if (purchaseFrequency === 'loyal') {
      filteredIds = userOrders.filter(u => u.orderCount >= 5).map(u => u._id);
    }

    matchingUserIds = matchingUserIds === null ? filteredIds : matchingUserIds.filter(id => filteredIds.includes(id));
  }

  // 2. Purchase amount filter (lifetime value)
  if (purchaseAmount) {
    const ordersCollection = db.collection('orders');
    const userSpending = await ordersCollection.aggregate([
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

    let filteredIds = [];
    if (purchaseAmount === 'high') {
      filteredIds = userSpending.filter(u => u.totalSpent >= 200).map(u => u._id);
    } else if (purchaseAmount === 'medium') {
      filteredIds = userSpending.filter(u => u.totalSpent >= 50 && u.totalSpent < 200).map(u => u._id);
    } else if (purchaseAmount === 'low') {
      filteredIds = userSpending.filter(u => u.totalSpent < 50).map(u => u._id);
    }

    matchingUserIds = matchingUserIds === null ? filteredIds : matchingUserIds.filter(id => filteredIds.includes(id));
  }

  // 3. Product preferences (categories purchased)
  if (productPreferences && productPreferences.length > 0) {
    const ordersCollection = db.collection('orders');
    const orders = await ordersCollection.find({
      'items.category': { $in: productPreferences }
    }).toArray();
    const filteredIds = [...new Set(orders.map(o => o.userId))].filter(Boolean);

    matchingUserIds = matchingUserIds === null ? filteredIds : matchingUserIds.filter(id => filteredIds.includes(id));
  }

  // 4. Rewards tier
  if (rewardsTier) {
    const rewardsCollection = db.collection('rewards');
    let rewardsQuery = {};
    
    if (rewardsTier === 'bronze') {
      rewardsQuery.points = { $lt: 500 };
    } else if (rewardsTier === 'silver') {
      rewardsQuery.points = { $gte: 500, $lt: 1000 };
    } else if (rewardsTier === 'gold') {
      rewardsQuery.points = { $gte: 1000 };
    }

    const rewards = await rewardsCollection.find(rewardsQuery).toArray();
    const filteredIds = rewards.map(r => r.userId).filter(Boolean);

    matchingUserIds = matchingUserIds === null ? filteredIds : matchingUserIds.filter(id => filteredIds.includes(id));
  }

  // 5. Challenge participation
  if (challengeParticipation) {
    const challengesCollection = db.collection('challenges');
    let challengeQuery = {};

    if (challengeParticipation === 'active') {
      challengeQuery.streakDays = { $gte: 3 };
    } else if (challengeParticipation === 'inactive') {
      challengeQuery = {
        $or: [
          { streakDays: { $lt: 3 } },
          { streakDays: { $exists: false } }
        ]
      };
    }

    const challenges = await challengesCollection.find(challengeQuery).toArray();
    const filteredIds = challenges.map(c => c.userId).filter(Boolean);

    matchingUserIds = matchingUserIds === null ? filteredIds : matchingUserIds.filter(id => filteredIds.includes(id));
  }

  // 6. Location filter (city-based)
  if (location && location.length > 0) {
    const usersCollection = db.collection('users');
    const users = await usersCollection.find({
      'address.city': { $in: location }
    }, { projection: { id: 1 } }).toArray();
    const filteredIds = users.map(u => u.id).filter(Boolean);

    matchingUserIds = matchingUserIds === null ? filteredIds : matchingUserIds.filter(id => filteredIds.includes(id));
  }

  // 7. Inactive customers (no orders in last 60 days)
  if (inactive === true) {
    const ordersCollection = db.collection('orders');
    const recentDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const recentOrders = await ordersCollection.find({
      createdAt: { $gte: recentDate }
    }).toArray();
    const recentUserIds = [...new Set(recentOrders.map(o => o.userId))].filter(Boolean);

    // Get all users
    const allUsers = await db.collection('users').find({}, { projection: { id: 1 } }).toArray();
    const allUserIds = allUsers.map(u => u.id).filter(Boolean);
    
    // Inactive = all users MINUS recent buyers
    const inactiveUserIds = allUserIds.filter(id => !recentUserIds.includes(id));

    matchingUserIds = matchingUserIds === null ? inactiveUserIds : matchingUserIds.filter(id => inactiveUserIds.includes(id));
  }

  // 8. Custom tags
  if (customTags && customTags.length > 0) {
    const usersCollection = db.collection('users');
    const users = await usersCollection.find({
      tags: { $in: customTags }
    }, { projection: { id: 1 } }).toArray();
    const filteredIds = users.map(u => u.id).filter(Boolean);

    matchingUserIds = matchingUserIds === null ? filteredIds : matchingUserIds.filter(id => filteredIds.includes(id));
  }

  // Build final query
  const finalQuery = {
    // Ensure email preferences allow marketing
    $or: [
      { 'emailPreferences.marketing': true },
      { 'emailPreferences.marketing': { $exists: false } } // Default to true if not set
    ]
  };

  // Add user ID filter if we have specific IDs
  if (matchingUserIds !== null) {
    finalQuery.id = { $in: matchingUserIds };
  }

  // Get final customer list
  const customers = await db.collection('users').find(finalQuery).toArray();
  
  debug(`📊 Segment matched ${customers.length} customers`);
  return customers;
}

/**
 * Send campaign to matching segment
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Object>} Send result
 */
export async function sendCampaign(campaignId) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  // Get campaign
  const campaign = await db.collection('campaigns').findOne({ id: campaignId });
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  if (campaign.status === 'sent') {
    throw new Error('Campaign already sent');
  }

  // Get recipients based on segment
  const recipients = await getSegmentCustomers(campaign.segmentCriteria || {});
  
  if (recipients.length === 0) {
    throw new Error('No recipients match the segment criteria');
  }

  // Update campaign status to sending
  await db.collection('campaigns').updateOne(
    { id: campaignId },
    {
      $set: {
        status: 'sending',
        'stats.totalRecipients': recipients.length,
        updatedAt: new Date()
      }
    }
  );

  debug(`📧 Starting campaign send: ${campaignId} to ${recipients.length} recipients`);

  // Send emails in background (non-blocking)
  sendCampaignEmails(campaignId, recipients, campaign).catch(err => {
    console.error(`❌ Campaign ${campaignId} send error:`, err);
  });

  return {
    success: true,
    campaignId,
    totalRecipients: recipients.length,
    message: `Campaign queued for ${recipients.length} recipients`
  };
}

/**
 * Send campaign emails to all recipients (background process)
 * @private
 */
async function sendCampaignEmails(campaignId, recipients, campaign) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  
  let sent = 0;
  let failed = 0;
  const errors = [];

  for (const recipient of recipients) {
    try {
      // Skip if no email
      if (!recipient.email) {
        failed++;
        continue;
      }

      // Generate unsubscribe token
      const unsubscribeToken = generateUnsubscribeToken(recipient.id, recipient.email);
      const unsubscribeUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/unsubscribe?token=${unsubscribeToken}`;

      // Build email HTML
      const emailHtml = buildCampaignEmailHtml(campaign, unsubscribeUrl);

      // Send email
      await sendEmail({
        to: recipient.email,
        subject: campaign.subject,
        html: emailHtml,
        userId: recipient.id,
        emailType: 'campaign'
      });

      // Log successful send
      await db.collection('email_sends').insertOne({
        id: `send_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        campaignId,
        userId: recipient.id,
        email: recipient.email,
        status: 'sent',
        sentAt: new Date()
      });

      sent++;
      
      // Log progress every 50 emails
      if (sent % 50 === 0) {
        debug(`📧 Campaign ${campaignId}: ${sent}/${recipients.length} sent`);
      }

    } catch (error) {
      console.error(`❌ Failed to send to ${recipient.email}:`, error.message);
      failed++;
      errors.push({ email: recipient.email, error: error.message });
      
      // Log failed send
      await db.collection('email_sends').insertOne({
        id: `send_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        campaignId,
        userId: recipient.id,
        email: recipient.email,
        status: 'failed',
        error: error.message,
        sentAt: new Date()
      });
    }

    // Rate limiting: 10 emails per second (Resend free tier limit)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Update campaign final stats
  await db.collection('campaigns').updateOne(
    { id: campaignId },
    {
      $set: {
        status: 'sent',
        sentAt: new Date(),
        'stats.sent': sent,
        'stats.failed': failed,
        updatedAt: new Date()
      }
    }
  );

  debug(`✅ Campaign ${campaignId} completed: ${sent} sent, ${failed} failed`);
  
  if (errors.length > 0 && errors.length <= 10) {
    debug('Failed emails sample:', errors);
  }
}

/**
 * Build campaign email HTML with proper structure
 * @private
 */
function buildCampaignEmailHtml(campaign, unsubscribeUrl) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${campaign.subject}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #059669 0%, #14b8a6 100%); padding: 40px 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; }
    .content { padding: 40px 20px; }
    .footer { background-color: #f3f4f6; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer p { color: #6b7280; font-size: 14px; margin: 0 0 10px 0; }
    .footer a { color: #9ca3af; text-decoration: underline; font-size: 12px; }
    a { color: #059669; }
  </style>
</head>
<body style="background-color: #f9fafb;">
  <div class="container">
    <div class="header">
      <h1>Taste of Gratitude</h1>
      ${campaign.preheader ? `<p style="color: #e5e7eb; margin: 10px 0 0 0; font-size: 14px;">${campaign.preheader}</p>` : ''}
    </div>
    
    <div class="content">
      ${campaign.body}
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} Taste of Gratitude. All rights reserved.</p>
      <p><a href="${unsubscribeUrl}">Unsubscribe from marketing emails</a></p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Get campaign with analytics
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Object>} Campaign with analytics
 */
export async function getCampaignAnalytics(campaignId) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const campaign = await db.collection('campaigns').findOne({ id: campaignId });
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const sends = await db.collection('email_sends').find({ campaignId }).toArray();
  
  const sentCount = sends.filter(s => s.status === 'sent').length;
  const failedCount = sends.filter(s => s.status === 'failed').length;

  return {
    campaign,
    sends,
    analytics: {
      totalRecipients: campaign.stats.totalRecipients || sends.length,
      sent: sentCount,
      failed: failedCount,
      deliveryRate: sends.length > 0 
        ? ((sentCount / sends.length) * 100).toFixed(1)
        : 0,
      failureRate: sends.length > 0
        ? ((failedCount / sends.length) * 100).toFixed(1)
        : 0
    }
  };
}

/**
 * Get all campaigns with optional filtering
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Campaigns list
 */
export async function getCampaigns(filters = {}) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const query = {};
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.createdBy) {
    query.createdBy = filters.createdBy;
  }

  const campaigns = await db.collection('campaigns')
    .find(query)
    .sort({ createdAt: -1 })
    .limit(filters.limit || 100)
    .toArray();

  return campaigns;
}

/**
 * Update campaign
 * @param {string} campaignId - Campaign ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated campaign
 */
export async function updateCampaign(campaignId, updates) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  // Prevent updating certain fields
  const { id, createdAt, createdBy, stats, ...allowedUpdates } = updates;

  const result = await db.collection('campaigns').findOneAndUpdate(
    { id: campaignId },
    {
      $set: {
        ...allowedUpdates,
        updatedAt: new Date()
      }
    },
    { returnDocument: 'after' }
  );

  if (!result.value) {
    throw new Error('Campaign not found');
  }

  return result.value;
}

/**
 * Delete campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteCampaign(campaignId) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  // Check if campaign was already sent
  const campaign = await db.collection('campaigns').findOne({ id: campaignId });
  if (campaign && campaign.status === 'sent') {
    throw new Error('Cannot delete sent campaigns');
  }

  const result = await db.collection('campaigns').deleteOne({ id: campaignId });
  return result.deletedCount > 0;
}
