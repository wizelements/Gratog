/**
 * Scheduled Email Queue System
 * Used for quiz follow-ups and scheduled marketing emails
 * Uses separate 'scheduled_emails' collection to avoid conflicts with transactional queue
 */
import { connectToDatabase } from './db-optimized';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';

const COLLECTION_NAME = 'scheduled_emails';

/**
 * Initialize scheduled emails collection with indexes
 */
export async function initializeEmailQueue() {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    await collection.createIndex({ id: 1 }, { unique: true });
    await collection.createIndex({ scheduledFor: 1, status: 1 });
    await collection.createIndex({ 'recipient.email': 1 });
    await collection.createIndex({ quizId: 1 }, { sparse: true });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ createdAt: -1 });
    
    logger.info('EmailQueue', 'Scheduled emails collection initialized with indexes');
    return { success: true };
  } catch (error) {
    logger.error('EmailQueue', 'Email queue initialization error', error);
    return { success: false, error: error.message };
  }
}

/**
 * Queue an email for future delivery
 * @param {Object} options - Queue options
 * @param {string} options.quizId - Optional quiz ID for follow-up emails
 * @param {Object} options.recipient - Recipient info { name, email, userId }
 * @param {string} options.emailType - Type of email (followUp3Day, followUp7Day, etc)
 * @param {Date|string} options.scheduledFor - When to send
 * @param {Object} options.emailData - Additional data for email template
 */
export async function queueEmail({
  quizId,
  recipient,
  emailType,
  scheduledFor,
  emailData
}) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    const emailId = `sched_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const now = new Date();
    
    const queuedEmail = {
      id: emailId,
      quizId: quizId || null,
      recipient: {
        name: recipient.name || '',
        email: recipient.email.toLowerCase().trim(),
        userId: recipient.userId || null
      },
      emailType,
      scheduledFor: new Date(scheduledFor),
      emailData: emailData || {},
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      lastAttemptAt: null,
      sentAt: null,
      error: null,
      createdAt: now,
      updatedAt: now
    };
    
    await collection.insertOne(queuedEmail);
    
    logger.info('EmailQueue', `Email queued: ${emailType} for ${recipient.email} at ${scheduledFor}`);
    return {
      success: true,
      emailId,
      data: queuedEmail
    };
  } catch (error) {
    logger.error('EmailQueue', 'Queue email error', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get pending emails that are due for delivery
 * @param {number} limit - Max emails to fetch
 */
export async function getPendingEmails(limit = 10) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    const now = new Date();
    
    const pendingEmails = await collection
      .find({
        status: 'pending',
        scheduledFor: { $lte: now },
        attempts: { $lt: 3 }
      })
      .sort({ scheduledFor: 1 })
      .limit(limit)
      .toArray();
    
    return {
      success: true,
      data: pendingEmails,
      count: pendingEmails.length
    };
  } catch (error) {
    logger.error('EmailQueue', 'Get pending emails error', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update email status after send attempt
 * @param {string} emailId - Email ID
 * @param {string} status - New status (pending, sent, failed, cancelled)
 * @param {string} error - Error message if failed
 */
export async function updateEmailStatus(emailId, status, error = null) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    const update = {
      $set: {
        status,
        lastAttemptAt: new Date(),
        updatedAt: new Date()
      }
    };
    
    if (status === 'sent') {
      update.$set.sentAt = new Date();
    } else if (status === 'failed' || status === 'pending') {
      // Only increment attempts on failures or retries, not on success
      update.$inc = { attempts: 1 };
    }
    
    if (error) {
      update.$set.error = error;
    }
    
    await collection.updateOne({ id: emailId }, update);
    
    return { success: true };
  } catch (error) {
    logger.error('EmailQueue', 'Update email status error', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel scheduled emails for a quiz (e.g., if customer purchased)
 * @param {string} quizId - Quiz ID
 * @param {string} reason - Cancellation reason
 */
export async function cancelScheduledEmails(quizId, reason = 'customer_purchased') {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    const result = await collection.updateMany(
      { 
        quizId,
        status: 'pending'
      },
      {
        $set: {
          status: 'cancelled',
          error: reason,
          updatedAt: new Date()
        }
      }
    );
    
    logger.info('EmailQueue', `Cancelled ${result.modifiedCount} scheduled emails for quiz ${quizId}`);
    return {
      success: true,
      cancelledCount: result.modifiedCount
    };
  } catch (error) {
    logger.error('EmailQueue', 'Cancel emails error', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get email queue statistics
 */
export async function getEmailQueueStats() {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    const stats = await collection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    const result = { pending: 0, sent: 0, failed: 0, cancelled: 0, total: 0 };
    
    stats.forEach(s => {
      if (result.hasOwnProperty(s._id)) {
        result[s._id] = s.count;
      }
      result.total += s.count;
    });
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    logger.error('EmailQueue', 'Get email queue stats error', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get emails by recipient
 * @param {string} email - Recipient email
 */
export async function getEmailsByRecipient(email) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    const emails = await collection
      .find({ 'recipient.email': email.toLowerCase() })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    
    return {
      success: true,
      data: emails,
      count: emails.length
    };
  } catch (error) {
    logger.error('EmailQueue', 'Get emails by recipient error', error);
    return {
      success: false,
      error: error.message
    };
  }
}
