import resend from './resend-client';
import { MongoClient } from 'mongodb';
import crypto from 'crypto';
import * as templates from './templates';

const MONGO_URL = process.env.MONGODB_URI || process.env.MONGO_URL;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  const client = await MongoClient.connect(MONGO_URL);
  cachedDb = client.db();
  return cachedDb;
}

/**
 * Generate unsubscribe token for user
 */
export function generateUnsubscribeToken(userId, email) {
  const data = `${userId}:${email}:${process.env.JWT_SECRET}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verify unsubscribe token
 */
export function verifyUnsubscribeToken(token, userId, email) {
  const expectedToken = generateUnsubscribeToken(userId, email);
  return token === expectedToken;
}

/**
 * Check if user has email preferences enabled
 */
export async function canSendEmail(userId, emailType) {
  try {
    const db = await connectToDatabase();
    const user = await db.collection('users').findOne({ id: userId });
    
    if (!user) return false;
    
    // Check if user has emailPreferences
    const prefs = user.emailPreferences || {
      marketing: true,
      orderUpdates: true,
      rewards: true,
      challenges: true
    };

    // Map email types to preferences
    const typeMapping = {
      welcome: 'marketing',
      order: 'orderUpdates',
      reward: 'rewards',
      challenge: 'challenges',
      password: 'orderUpdates' // Always send password resets
    };

    const prefKey = typeMapping[emailType];
    return prefKey === 'orderUpdates' || prefs[prefKey] !== false;
  } catch (error) {
    console.error('Error checking email preferences:', error);
    return true; // Default to allowing emails if check fails
  }
}

/**
 * Queue email for sending
 */
export async function queueEmail({
  to,
  subject,
  html,
  userId = null,
  emailType = 'transactional',
  metadata = {}
}) {
  try {
    const db = await connectToDatabase();
    const emailQueue = db.collection('email_queue');

    const email = {
      id: crypto.randomUUID(),
      to,
      subject,
      html,
      userId,
      emailType,
      metadata,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      scheduledFor: new Date()
    };

    await emailQueue.insertOne(email);
    console.log(`📧 Email queued: ${email.id} to ${to}`);
    
    return { success: true, emailId: email.id };
  } catch (error) {
    console.error('Error queueing email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send email immediately (bypasses queue)
 * Alias: sendEmail (for backward compatibility)
 */
export async function sendEmailNow({
  to,
  subject,
  html,
  userId = null,
  emailType = 'transactional'
}) {
  try {
    // Check email preferences
    if (userId && emailType !== 'password') {
      const canSend = await canSendEmail(userId, emailType);
      if (!canSend) {
        console.log(`⛔ Email not sent - user preferences disabled: ${emailType} to ${to}`);
        return { success: false, reason: 'user_preferences_disabled' };
      }
    }

    if (!resend) {
      // Development mode - log email instead of sending
      console.log('📧 [DEV MODE] Email would be sent:', {
        to,
        subject,
        preview: html.substring(0, 200) + '...'
      });
      
      // Log to database
      await logEmail({
        to,
        subject,
        userId,
        emailType,
        status: 'dev_logged',
        sentAt: new Date()
      });
      
      return { success: true, mode: 'development' };
    }

    // Send via Resend
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'hello@tasteofgratitude.com',
      to: [to],
      subject,
      html
    });

    console.log(`✅ Email sent successfully: ${result.id} to ${to}`);

    // Log to database
    await logEmail({
      to,
      subject,
      userId,
      emailType,
      status: 'sent',
      resendId: result.id,
      sentAt: new Date()
    });

    return { success: true, resendId: result.id };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    
    // Log failed email
    await logEmail({
      to,
      subject,
      userId,
      emailType,
      status: 'failed',
      error: error.message,
      sentAt: new Date()
    });

    return { success: false, error: error.message };
  }
}

/**
 * Log email to database
 */
async function logEmail(emailData) {
  try {
    const db = await connectToDatabase();
    const emailLogs = db.collection('email_logs');
    
    await emailLogs.insertOne({
      id: crypto.randomUUID(),
      ...emailData,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Error logging email:', error);
  }
}

/**
 * Process email queue (called by cron job)
 */
export async function processEmailQueue() {
  try {
    const db = await connectToDatabase();
    const emailQueue = db.collection('email_queue');

    // Get pending emails that are ready to send
    const pendingEmails = await emailQueue
      .find({
        status: 'pending',
        scheduledFor: { $lte: new Date() },
        attempts: { $lt: 3 }
      })
      .limit(10) // Process 10 at a time
      .toArray();

    console.log(`📤 Processing ${pendingEmails.length} queued emails`);

    for (const email of pendingEmails) {
      // Mark as processing
      await emailQueue.updateOne(
        { id: email.id },
        { 
          $set: { status: 'processing' },
          $inc: { attempts: 1 }
        }
      );

      // Send email
      const result = await sendEmailNow({
        to: email.to,
        subject: email.subject,
        html: email.html,
        userId: email.userId,
        emailType: email.emailType
      });

      // Update queue status
      if (result.success) {
        await emailQueue.updateOne(
          { id: email.id },
          { 
            $set: { 
              status: 'sent',
              sentAt: new Date(),
              resendId: result.resendId
            }
          }
        );
      } else {
        const newStatus = email.attempts + 1 >= 3 ? 'failed' : 'pending';
        await emailQueue.updateOne(
          { id: email.id },
          { 
            $set: { 
              status: newStatus,
              lastError: result.error,
              lastAttemptAt: new Date()
            }
          }
        );
      }

      // Small delay between emails to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { processed: pendingEmails.length };
  } catch (error) {
    console.error('Error processing email queue:', error);
    return { error: error.message };
  }
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(user) {
  const unsubscribeToken = generateUnsubscribeToken(user.id, user.email);
  const html = templates.welcomeEmail(
    { name: user.name, rewardPoints: 0 },
    unsubscribeToken
  );

  return sendEmailNow({
    to: user.email,
    subject: '🌿 Welcome to Taste of Gratitude!',
    html,
    userId: user.id,
    emailType: 'welcome'
  });
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail(user, order) {
  const unsubscribeToken = generateUnsubscribeToken(user.id, user.email);
  const html = templates.orderConfirmationEmail(
    {
      name: user.name,
      orderNumber: order.orderNumber,
      items: order.items,
      total: order.total,
      fulfillmentType: order.fulfillment?.type || 'Pickup',
      pointsEarned: Math.floor(order.total * 10) // 10 points per dollar
    },
    unsubscribeToken
  );

  return sendEmailNow({
    to: user.email,
    subject: `📦 Order Confirmed - #${order.orderNumber}`,
    html,
    userId: user.id,
    emailType: 'order'
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(user, resetToken) {
  const html = templates.passwordResetEmail(
    { name: user.name, resetToken },
    null // No unsubscribe for password resets
  );

  return sendEmailNow({
    to: user.email,
    subject: '🔐 Password Reset Request',
    html,
    userId: user.id,
    emailType: 'password'
  });
}

/**
 * Send reward milestone email
 */
export async function sendRewardMilestoneEmail(user, reward) {
  const unsubscribeToken = generateUnsubscribeToken(user.id, user.email);
  const html = templates.rewardMilestoneEmail(
    {
      name: user.name,
      milestone: reward.milestone,
      points: reward.points,
      rewardName: reward.rewardName
    },
    unsubscribeToken
  );

  return sendEmailNow({
    to: user.email,
    subject: `🎁 You've Unlocked a Reward!`,
    html,
    userId: user.id,
    emailType: 'reward'
  });
}

/**
 * Send challenge streak email
 */
export async function sendChallengeStreakEmail(user, challenge) {
  const unsubscribeToken = generateUnsubscribeToken(user.id, user.email);
  const html = templates.challengeStreakEmail(
    {
      name: user.name,
      streakDays: challenge.streakDays,
      milestone: challenge.milestone
    },
    unsubscribeToken
  );

  return sendEmailNow({
    to: user.email,
    subject: `🔥 ${challenge.streakDays} Day Streak Achieved!`,
    html,
    userId: user.id,
    emailType: 'challenge'
  });
}

// Backward compatibility export
export const sendEmail = sendEmailNow;
