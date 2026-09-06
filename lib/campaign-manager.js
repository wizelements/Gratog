const DEBUG = process.env.DEBUG === "true" || process.env.VERBOSE === "true";
const debug = (...args) => { if (DEBUG) console.log('[CampaignManager]', ...args); };

import { sendEmail } from './email/service';
import { generateUnsubscribeToken } from './email/service';
import {
  deleteDraftCampaign, findCampaign, insertCampaign, insertCampaignSend,
  listCampaignSends, listCampaigns as listStoredCampaigns, listSegmentCustomers,
  updateCampaignFields,
} from './campaigns/repository';

/**
 * Custom error class for campaign validation failures
 * Allows API routes to distinguish user errors from system errors
 */
export class CampaignValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CampaignValidationError';
  }
}

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
  // Input validation - use CampaignValidationError for user-facing errors
  if (!name || name.trim().length === 0) {
    throw new CampaignValidationError('Campaign name is required');
  }
  if (!subject || subject.trim().length === 0) {
    throw new CampaignValidationError('Subject line is required');
  }
  if (!body || body.trim().length === 0) {
    throw new CampaignValidationError('Email body is required');
  }
  if (!createdBy) {
    throw new CampaignValidationError('Creator ID is required');
  }

  // Validate scheduledFor if provided
  let scheduledDate = null;
  if (scheduledFor) {
    const d = new Date(scheduledFor);
    if (Number.isNaN(d.getTime())) {
      throw new CampaignValidationError('Invalid scheduled send time');
    }
    if (d < new Date()) {
      throw new CampaignValidationError('Scheduled send time must be in the future');
    }
    scheduledDate = d;
  }

  const campaign = {
    id: `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: name.trim(),
    subject: subject.trim(),
    preheader: preheader?.trim() || '',
    body: body.trim(),
    segmentCriteria: segmentCriteria || {},
    status: scheduledDate ? 'scheduled' : 'draft',
    scheduledFor: scheduledDate,
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

  try {
    await insertCampaign(campaign);
  } catch (dbError) {
    console.error('[CampaignManager] Failed to insert campaign', {
      id: campaign.id,
      createdBy,
      error: dbError.message,
    });
    throw dbError;
  }
  
  debug(`✅ Campaign created: ${campaign.id} by ${createdBy}`);
  return campaign;
}

/**
 * Get customers matching segment criteria with robust filtering
 * @param {Object} segmentCriteria - Segmentation criteria
 * @returns {Promise<Array>} Matching customers
 */
export async function getSegmentCustomers(segmentCriteria = {}) {
  const customers = await listSegmentCustomers(segmentCriteria);
  
  debug(`📊 Segment matched ${customers.length} customers`);
  return customers;
}

/**
 * Send campaign to matching segment
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Object>} Send result
 */
export async function sendCampaign(campaignId) {
  // Get campaign
  const campaign = await findCampaign(campaignId);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // Check valid statuses for sending
  if (campaign.status === 'sent') {
    return { alreadySent: true, campaignId, message: 'Campaign already sent' };
  }
  
  // Allow sending from: draft, scheduled, processing (from cron)
  const validStatuses = ['draft', 'scheduled', 'processing', 'sending'];
  if (!validStatuses.includes(campaign.status)) {
    throw new Error(`Campaign in invalid status for sending: ${campaign.status}`);
  }

  // Get recipients based on segment
  const recipients = await getSegmentCustomers(campaign.segmentCriteria || {});
  
  if (recipients.length === 0) {
    throw new Error('No recipients match the segment criteria');
  }

  // Update campaign status to sending
  await updateCampaignFields(campaignId, { status: 'sending', stats: { totalRecipients: recipients.length } });

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
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const errors = [];

  // Update campaign to 'sending' status
  await updateCampaignFields(campaignId, { status: 'sending', stats: { totalRecipients: recipients.length } });

  for (const recipient of recipients) {
    try {
      if (!recipient.email) {
        skipped++;
        continue;
      }

      const unsubscribeToken = generateUnsubscribeToken(recipient.id, recipient.email);
      const unsubscribeUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/unsubscribe?token=${unsubscribeToken}`;
      const emailHtml = buildCampaignEmailHtml(campaign, unsubscribeUrl);

      const result = await sendEmail({
        to: recipient.email,
        subject: campaign.subject,
        html: emailHtml,
        userId: recipient.id,
        emailType: 'campaign',
        listUnsubscribeUrl: unsubscribeUrl,
        metadata: { campaignId, recordEmailSends: false }
      });

      if (result.skipped) {
        // Distinguish between user opt-out and infra errors
        const isInfraError = result.reason === 'infra_error';
        if (isInfraError) {
          failed++; // Infra errors count as failures, not skips
          errors.push({ email: recipient.email, error: result.error || 'DB connection error' });
        } else {
          skipped++; // User opted out - this is expected behavior
        }
        
        await insertCampaignSend({
          id: `send_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          campaignId,
          userId: recipient.id,
          email: recipient.email,
          status: isInfraError ? 'failed' : 'skipped',
          reason: result.reason,
          error: result.error || null,
          sentAt: new Date()
        });
      } else if (result.success) {
        sent++;
        await insertCampaignSend({
          id: `send_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          campaignId,
          userId: recipient.id,
          email: recipient.email,
          status: 'sent',
          resendId: result.resendId,
          sentAt: new Date()
        });
      } else {
        // Mock mode (no RESEND_API_KEY) or other non-success
        failed++;
        const reason = result.warning || result.reason || 'unknown';
        errors.push({ email: recipient.email, error: reason });
        
        await insertCampaignSend({
          id: `send_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          campaignId,
          userId: recipient.id,
          email: recipient.email,
          status: 'not_sent',
          reason: reason,
          sentAt: new Date()
        });
      }
    } catch (error) {
      console.error(`❌ Failed to send to ${recipient.email}:`, error.message);
      failed++;
      errors.push({ email: recipient.email, error: error.message });
      
      await insertCampaignSend({
        id: `send_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        campaignId,
        userId: recipient.id,
        email: recipient.email,
        status: 'failed',
        error: error.message,
        sentAt: new Date()
      });
    }

    // Rate limiting: 10 emails per second (Resend limit)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Log progress every 50 emails
    if ((sent + failed + skipped) % 50 === 0) {
      debug(`📧 Campaign ${campaignId}: ${sent} sent, ${failed} failed, ${skipped} skipped of ${recipients.length}`);
    }
  }

  // Determine final status with better logic
  // - 'sent' = at least some emails were sent successfully
  // - 'partially_sent' = some sent, but significant failures  
  // - 'failed' = no emails were sent (all failed or no RESEND_API_KEY)
  let finalStatus = 'sent';
  if (sent === 0) {
    finalStatus = 'failed';
  } else if (failed > 0 && failed > sent) {
    finalStatus = 'partially_sent';
  }
  
  // Store errors summary if any
  const errorSummary = errors.length > 0 
    ? errors.slice(0, 5).map(e => e.error).join('; ')
    : null;

  await updateCampaignFields(campaignId, {
    status: finalStatus, sentAt: new Date(), lastError: errorSummary,
    stats: { sent, failed, skipped, totalRecipients: recipients.length }
  });

  debug(`✅ Campaign ${campaignId} completed: ${sent} sent, ${failed} failed, ${skipped} skipped (status: ${finalStatus})`);
  
  return { sent, failed, skipped, status: finalStatus, errors: errors.slice(0, 10) };
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
  const campaign = await findCampaign(campaignId);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const sends = await listCampaignSends(campaignId);
  
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
  return listStoredCampaigns(filters);
}

/**
 * Update campaign
 * @param {string} campaignId - Campaign ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated campaign
 */
export async function updateCampaign(campaignId, updates) {
  // Prevent updating certain fields
  const { id, createdAt, createdBy, stats, ...allowedUpdates } = updates;

  const result = await updateCampaignFields(campaignId, allowedUpdates);
  if (!result) {
    throw new Error('Campaign not found');
  }

  return result;
}

/**
 * Delete campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteCampaign(campaignId) {
  // Check if campaign was already sent
  const campaign = await findCampaign(campaignId);
  if (campaign && campaign.status === 'sent') {
    throw new Error('Cannot delete sent campaigns');
  }

  return deleteDraftCampaign(campaignId);
}
