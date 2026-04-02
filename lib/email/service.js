import resend from './resend-client';
import { connectToDatabase } from '@/lib/db-optimized';
import crypto from 'crypto';
import * as templates from './templates';
import { getFromAddress } from '@/lib/email-config';
import { logger } from '@/lib/logger';

const TRANSACTIONAL_EMAIL_TYPES = ['password', 'order', 'order_confirmation', 'order_status', 'payment_confirmed', 'transactional'];
const MARKETING_EMAIL_TYPES = ['campaign', 'newsletter', 'newsletter_confirmation', 'coupon', 'discount', 'promotional'];
const REWARDS_EMAIL_TYPES = ['reward', 'loyalty_reward', 'review_thank_you'];
const CHALLENGE_EMAIL_TYPES = ['challenge'];

/**
 * Get database connection using centralized pool
 * Uses the same connection pool as the rest of the application
 */
async function getDb() {
  const { db } = await connectToDatabase();
  return db;
}

/**
 * Generate unsubscribe token for user
 * Encodes userId and email in a signed, expiring token
 */
// ISS-054 FIX: Fail closed — no hardcoded fallback secret
function getHmacSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
}

export function generateUnsubscribeToken(userId, email) {
  const payload = Buffer.from(JSON.stringify({ u: userId, e: email, t: Date.now() })).toString('base64url');
  const signature = crypto.createHmac('sha256', getHmacSecret())
    .update(payload)
    .digest('hex')
    .substring(0, 16);
  return `${payload}.${signature}`;
}

/**
 * Verify unsubscribe token and extract userId/email
 * Returns { userId, email } or null if invalid/expired
 */
export function verifyUnsubscribeToken(token) {
  try {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;
    
    const expectedSig = crypto.createHmac('sha256', getHmacSecret())
      .update(payload)
      .digest('hex')
      .substring(0, 16);
    
    if (signature !== expectedSig) return null;
    
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    // Token expires after 90 days
    if (Date.now() - data.t > 90 * 24 * 60 * 60 * 1000) return null;
    
    return { userId: data.u, email: data.e };
  } catch {
    return null;
  }
}

/**
 * Check if user has email preferences enabled for given type
 * Returns: { allowed: boolean, reason: string }
 */
export async function canSendEmail(userId, emailType, email = null) {
  try {
    // Transactional emails always allowed
    if (TRANSACTIONAL_EMAIL_TYPES.includes(emailType)) {
      return { allowed: true, reason: 'transactional' };
    }

    const db = await getDb();
    const normalizedEmail = email?.trim().toLowerCase() || null;
    
    // Honor one-click opt-outs even when a send only knows the recipient email.
    if (MARKETING_EMAIL_TYPES.includes(emailType) && normalizedEmail) {
      const unsubscribeRecord = await db.collection('unsubscribes').findOne(
        { email: normalizedEmail },
        { projection: { _id: 1 } }
      );

      if (unsubscribeRecord) {
        return { allowed: false, reason: 'marketing_opt_out' };
      }
    }

    const userLookup = userId
      ? { id: userId }
      : normalizedEmail
        ? { email: normalizedEmail }
        : null;
    const user = userLookup ? await db.collection('users').findOne(userLookup) : null;

    if (!user) {
      // Allow if user not found (guest checkout / reviewed external recipient)
      return { allowed: true, reason: 'guest_user' };
    }

    const prefs = user.emailPreferences || {};
    
    // Marketing emails require explicit consent
    if (MARKETING_EMAIL_TYPES.includes(emailType)) {
      const allowed = prefs.marketing !== false;
      return { allowed, reason: allowed ? 'marketing_allowed' : 'marketing_opt_out' };
    }
    
    // Rewards/challenge emails
    if (REWARDS_EMAIL_TYPES.includes(emailType)) {
      const allowed = prefs.rewards !== false;
      return { allowed, reason: allowed ? 'rewards_allowed' : 'rewards_opt_out' };
    }
    if (CHALLENGE_EMAIL_TYPES.includes(emailType)) {
      const allowed = prefs.challenges !== false;
      return { allowed, reason: allowed ? 'challenges_allowed' : 'challenges_opt_out' };
    }
    
    // Default allow for unknown types
    return { allowed: true, reason: 'default_allow' };
  } catch (error) {
    // CRITICAL: Log the actual error and return infra_error
    // This distinguishes DB failures from user opt-outs
    logger.error('Email', 'DB error checking email preferences', {
      userId,
      email: email?.trim().toLowerCase() || null,
      emailType,
      error: error.message
    });
    console.error('Error checking email preferences:', error);
    return { allowed: false, reason: 'infra_error', error: error.message };
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
    const db = await getDb();
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
    logger.info('Email queued', { emailId: email.id, to });
    
    return { success: true, emailId: email.id };
  } catch (error) {
    console.error('Error queueing email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send email immediately (bypasses queue)
 * Throws on failure for critical emails
 * Alias: sendEmail (for backward compatibility)
 */
export async function sendEmailNow({
  to,
  subject,
  html,
  text,
  userId = null,
  emailType = 'transactional',
  replyTo = null
}) {
  // Check email preferences (skip for password resets)
  if (emailType !== 'password') {
    const prefCheck = await canSendEmail(userId, emailType, to);
    if (!prefCheck.allowed) {
      // Distinguish between user opt-out and infrastructure errors
      if (prefCheck.reason === 'infra_error') {
        logger.warn('Email', 'Skipping email due to DB error', { to, reason: prefCheck.reason });
        return { 
          success: false, 
          reason: 'infra_error', 
          error: prefCheck.error,
          skipped: true 
        };
      }
      // User actually opted out
      return { 
        success: false, 
        reason: prefCheck.reason, 
        skipped: true 
      };
    }
  }

  if (!resend) {
    // Development mode - clearly log that NO email was sent
    console.warn('⚠️ [NO EMAIL SENT] RESEND_API_KEY not configured', { to, subject });
    
    await logEmail({
      to, subject, userId, emailType,
      status: 'mock_not_sent',
      sentAt: new Date()
    });
    
    return { 
      success: false, 
      mode: 'development',
      warning: 'No RESEND_API_KEY - email NOT sent'
    };
  }

  try {
    const emailPayload = {
      from: process.env.RESEND_FROM_EMAIL || getFromAddress(emailType),
      to: [to],
      subject,
      html
    };
    
    if (text) {
      emailPayload.text = text;
    }

    if (replyTo) {
      emailPayload.replyTo = replyTo;
    }
    
    const result = await resend.emails.send(emailPayload);

    console.log(`✅ Email sent successfully: ${result.id} to ${to}`);

    await logEmail({
      to, subject, userId, emailType,
      status: 'sent',
      resendId: result.id,
      sentAt: new Date()
    });

    return { success: true, resendId: result.id };
  } catch (error) {
    console.error('❌ Email send failed:', error);
    
    await logEmail({
      to, subject, userId, emailType,
      status: 'failed',
      error: error.message,
      sentAt: new Date()
    });

    // THROW so callers know it failed
    throw new Error(`Email send failed: ${error.message}`);
  }
}

/**
 * Log email to database
 */
async function logEmail(emailData) {
  try {
    const db = await getDb();
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
    const db = await getDb();
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

      try {
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
        } else if (result.skipped) {
          await emailQueue.updateOne(
            { id: email.id },
            { 
              $set: { 
                status: 'skipped',
                reason: result.reason
              }
            }
          );
        }
      } catch (sendError) {
        const newStatus = email.attempts + 1 >= 3 ? 'failed' : 'pending';
        await emailQueue.updateOne(
          { id: email.id },
          { 
            $set: { 
              status: newStatus,
              lastError: sendError.message,
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
