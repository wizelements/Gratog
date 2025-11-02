// Email Queue System for Scheduled Emails
import { connectToDatabase } from './db-optimized';
import { randomUUID } from 'crypto';

const COLLECTION_NAME = 'email_queue';

/**
 * Initialize email queue collection with indexes
 */
export async function initializeEmailQueue() {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    // Create indexes
    await collection.createIndex({ scheduledFor: 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ quizId: 1 });
    await collection.createIndex({ 'recipient.email': 1 });
    
    console.log('✅ Email queue collection initialized with indexes');
    return { success: true };
  } catch (error) {
    console.error('Email queue initialization error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Queue an email for future delivery
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
    
    const emailId = randomUUID();
    const now = new Date();
    
    const queuedEmail = {
      _id: emailId,
      quizId,
      recipient: {
        name: recipient.name,
        email: recipient.email.toLowerCase().trim()
      },
      emailType, // 'followUp3Day' or 'followUp7Day'
      scheduledFor: new Date(scheduledFor),
      emailData, // Additional data for email template
      status: 'pending', // 'pending', 'sent', 'failed', 'cancelled'
      attempts: 0,
      lastAttemptAt: null,
      sentAt: null,
      error: null,
      createdAt: now,
      updatedAt: now
    };
    
    await collection.insertOne(queuedEmail);
    
    console.log(`✅ Email queued: ${emailType} for ${recipient.email} at ${scheduledFor}`);
    return {
      success: true,
      emailId,
      data: queuedEmail
    };
  } catch (error) {
    console.error('Queue email error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get pending emails that are due for delivery
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
        attempts: { $lt: 3 } // Max 3 attempts
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
    console.error('Get pending emails error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update email status after send attempt
 */
export async function updateEmailStatus(emailId, status, error = null) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    const setUpdate = {
      status,
      lastAttemptAt: new Date(),
      updatedAt: new Date()
    };
    
    if (status === 'sent') {
      setUpdate.sentAt = new Date();
    }
    
    if (error) {
      setUpdate.error = error;
    }
    
    await collection.updateOne(
      { _id: emailId },
      { 
        $set: setUpdate,
        $inc: { attempts: 1 }
      }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Update email status error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel scheduled emails for a quiz (e.g., if customer purchased)
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
    
    console.log(`✅ Cancelled ${result.modifiedCount} scheduled emails for quiz ${quizId}`);
    return {
      success: true,
      cancelledCount: result.modifiedCount
    };
  } catch (error) {
    console.error('Cancel emails error:', error);
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
    
    const [stats] = await collection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    const pending = await collection.countDocuments({ status: 'pending' });
    const sent = await collection.countDocuments({ status: 'sent' });
    const failed = await collection.countDocuments({ status: 'failed' });
    const cancelled = await collection.countDocuments({ status: 'cancelled' });
    
    return {
      success: true,
      data: {
        pending,
        sent,
        failed,
        cancelled,
        total: pending + sent + failed + cancelled
      }
    };
  } catch (error) {
    console.error('Get email queue stats error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
